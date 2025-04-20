const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const fsPromises = fs.promises;
const axios = require("axios");
const connectDB = require("./Config/database");
const cookieParser = require("cookie-parser");
const authMiddleware = require('./Middleware/Auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const winston = require('winston');
const os = require('os');
require('winston-daily-rotate-file');

// Add this debugging code that writes directly to the terminal - this bypasses all logging systems
process.stdout.write("\n\n=== STARTING SERVER PROCESS ===\n\n");

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_URL = process.env.GEMINI_URL;

// Validate essential environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  process.stdout.write(`\x1b[31mMissing required environment variables: ${missingEnvVars.join(', ')}\x1b[0m\n`);
  process.exit(1);
}

// Log network interfaces to diagnose connection issues
const networkInterfaces = os.networkInterfaces();
process.stdout.write("Available network interfaces:\n");
Object.keys(networkInterfaces).forEach(name => {
  networkInterfaces[name].forEach(iface => {
    process.stdout.write(`${name}: ${iface.address} (${iface.family})\n`);
  });
});

// Configure Winston logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'revute-api' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

//console transport for non-production environments
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Store original console methods (must use bind to preserve context)
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleDebug = console.debug.bind(console);

// Override console methods
console.log = function(message, ...args) {
  logger.info(message, ...args);
};
console.info = function(message, ...args) {
  logger.info(message, ...args);
};
console.warn = function(message, ...args) {
  logger.warn(message, ...args);
};
console.error = function(message, ...args) {
  logger.error(message, ...args);
};
console.debug = function(message, ...args) {
  logger.debug(message, ...args);
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://via.placeholder.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, 
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// HTTP parameter pollution protection
app.use(hpp());

// Response compression
app.use(compression());

// Cookie parser
app.use(cookieParser());

// Configure CORS properly for cross-origin requests
app.use(
  cors({
    origin: NODE_ENV === 'production' 
      ? [
          FRONTEND_URL, 
          'https://revuteai.com', 
          'https://revuteai.in', 
          "https://d20g4sb0sgft6.cloudfront.net", 
          "http://revutesetup.s3-website-us-east-1.amazonaws.com",
          "http://localhost:5173",
          "http://3.84.35.237:8000" 
        ] 
      : ["http://localhost:5173", "http://3.84.35.237:8000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["set-cookie"] // Required for cookie auth
  })
);

// Request size limits
app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  next();
});

// Debug middleware for auth issues (only in development)
if (NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug({
      message: 'Request debug',
      path: req.path,
      cookies: req.cookies,
      headers: req.headers
    });
    next();
  });
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Detailed readiness check
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    
    res.status(200).json({
      status: 'READY',
      checks: {
        database: 'UP'
      }
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'NOT READY',
      checks: {
        database: 'DOWN'
      },
      message: NODE_ENV === 'production' ? 'Service not ready' : error.message
    });
  }
});

// Routes
app.use("/api/users", require("./Routes/UserRoute"));
app.use("/api/leaderboard", require("./Routes/LeaderboardRoute"));
app.use("/api/admin", require("./Routes/AdminRoutes"));
app.use("/api/profile", require("./Routes/ProfileRoute"));
app.use('/api/logout', require("./Routes/LogoutRoute"));

app.get('/', (req, res) => {
  res.send("Welcome to the backend server NodeJs!");
});

// Banking training collection
const getBankingTrainingCollection = () => {
  return mongoose.connection.db.collection('user_banking_training');
};

app.get('/api/debug/banking-training/:userId', async (req, res) => {
  try {
    const collection = getBankingTrainingCollection();
    const result = await collection.findOne({ user_id: req.params.userId });
    res.json(result);
  } catch (error) {
    logger.error('Error retrieving banking training data', error);
    res.status(500).json({ error: NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
});

app.get('/api/banking/banking-training', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const collection = getBankingTrainingCollection();
    
    // Find the document by user_id as string
    const userData = await collection.findOne({ user_id: userId });
    
    if (!userData) {
      return res.json({ 
        user_id: userId,
        scenarios: [] 
      });
    }
    
    // Ensure the data structure is complete
    if (!userData.scenarios) {
      userData.scenarios = [];
    }
    
    // Return the document with minimal processing
    res.json(userData);
  } catch (error) {
    logger.error('Error fetching banking training data', error);
    res.status(500).json({ message: 'Server error retrieving banking training data' });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { userMessage } = req.body;
    
    if (!GEMINI_URL) {
      return res.status(500).json({ error: "GEMINI_URL is not configured." });
    }

    const response = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: userMessage }] }]
    });

    const botReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
    res.json({ botReply });
  } catch (error) {
    logger.error('Error calling Gemini API', error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Add route to set a secure cookie for testing
app.get('/api/test/set-cookie', (req, res) => {
  res.cookie('test-cookie', 'cookie-value', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 
  });
  res.json({ message: 'Test cookie set' });
});

// Add route to check if cookie is being received
app.get('/api/test/check-cookie', (req, res) => {
  res.json({ 
    cookies: req.cookies,
    message: req.cookies['test-cookie'] ? 'Cookie found' : 'Cookie not found',
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
});

// Catch-all route for SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// General error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// Graceful shutdown
const gracefulShutdown = (server, signal) => {
  process.stdout.write(`\n${signal} received. Closing HTTP server and disconnecting from database...\n`);
  logger.info(`${signal} received. Closing HTTP server and disconnecting from database...`);
  
  // Create a 10-second timeout for forceful shutdown
  const forceExit = setTimeout(() => {
    process.stdout.write("\nForcing process exit after timeout\n");
    logger.error('Forcing process exit after timeout');
    process.exit(1);
  }, 10000);
  
  server.close(async () => {
    process.stdout.write("\nHTTP server closed\n");
    logger.info('HTTP server closed');
    
    try {
      await mongoose.connection.close();
      process.stdout.write("\nDatabase connection closed\n");
      logger.info('Database connection closed');
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      process.stdout.write(`\nError closing database connection: ${error.message}\n`);
      logger.error('Error closing database connection:', error);
      clearTimeout(forceExit);
      process.exit(1);
    }
  });
};

// Database connection and start server code
const startServer = async () => {
  try {
    process.stdout.write("\nAttempting to connect to database...\n");
    await connectDB(MONGODB_URI);
    process.stdout.write("\x1b[32m\nDatabase connected successfully!\x1b[0m\n");
    logger.info('Database connected successfully');
    
    process.stdout.write(`\nStarting HTTP server on port ${PORT}...\n`);
    const server = app.listen(PORT, () => {
      // Create a visually distinct server start message
      const startMessage = `
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🚀  REVUTE API SERVER STARTED SUCCESSFULLY!       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   📡  Environment: ${NODE_ENV.padEnd(30)}│
│   🔌  Port:        ${PORT.toString().padEnd(30)}│
│   🌐  Local URL:   http://localhost:${PORT}${' '.repeat(20-PORT.toString().length)}│
│   🔒  Auth:        Cookie-based authentication      │
│                                                     │
└─────────────────────────────────────────────────────┘
`;
      
      // Write directly to stdout for maximum visibility
      process.stdout.write('\x1b[36m' + startMessage + '\x1b[0m');
      
      // Also log through normal channels
      logger.info(`Server running in ${NODE_ENV} mode on port: ${PORT}`);
      
      // Show direct terminal message about IPv6 vs IPv4
      process.stdout.write('\n\x1b[33mTIP: If you have connection issues, try accessing via IPv4: http://127.0.0.1:' + PORT + '\x1b[0m\n\n');
    });
    
    // Setup signal handlers
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => gracefulShutdown(server, signal));
    });
    
    process.on('uncaughtException', (error) => {
      process.stdout.write(`\n\x1b[31mUncaught Exception: ${error.message}\x1b[0m\n`);
      logger.error('Uncaught Exception:', error);
      gracefulShutdown(server, 'Uncaught Exception');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      process.stdout.write(`\n\x1b[31mUnhandled Rejection: ${reason}\x1b[0m\n`);
      logger.error('Unhandled Rejection at:', { promise, reason });
      // Don't exit here, just log the issue
    });
    
    return server;
  } catch (error) {
    process.stdout.write(`\n\x1b[31mFATAL ERROR STARTING SERVER: ${error.message}\x1b[0m\n`);
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
