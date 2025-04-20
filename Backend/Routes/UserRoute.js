const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Model/UserSchema');
const Admin = require('../Model/AdminSchema');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

dotenv.config();
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure CORS options specifically for these routes
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:5173', 'http://3.84.35.237:8000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply cors to all routes in this router
router.use(cors(corsOptions));

// Rate limiting for login attempts - prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Input validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).escape()
    .withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail()
    .withMessage('Must provide a valid email address'),
  body('password').isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

// Register endpoint with validation
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { username, email, password, confirmPassword, adminName } = req.body;
    
    // Check for existing users
    let existingUser = await User.findOne({ email }) || await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check for existing username
    existingUser = await User.findOne({ username }) || await Admin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Determine user role
    let finalUsername = username;
    let finalRole = 'user';
    let finalAdminName = adminName && adminName.trim() !== "" ? adminName : null;
    
    if (username.includes('_')) {
      const parts = username.split('_');
      if (parts.length >= 2) {
        const productId = parts[parts.length - 1].trim();
        const namePart = parts.slice(0, parts.length - 1).join('_').trim();
        if (process.env.ADMIN_PRODUCT_ID && productId === process.env.ADMIN_PRODUCT_ID.trim()) {
          finalUsername = namePart;
          finalRole = 'admin';
          finalAdminName = null;
        }
      }
    }

    // Create user based on role
    if (finalRole === 'admin') {
      const newAdmin = new Admin({
        username: finalUsername,
        email,
        password: hashedPassword,
        role: finalRole,
      });
      await newAdmin.save();
      return res.status(201).json({ message: 'Admin registered successfully' });
    } else {
      if (finalAdminName) {
        const existingAdmin = await Admin.findOne({ username: finalAdminName });
        if (!existingAdmin) {
          return res.status(400).json({ message: 'Admin name does not exist' });
        }
      }
      const newUser = new User({
        username: finalUsername,
        email,
        password: hashedPassword,
        role: finalRole,
        adminName: finalAdminName,
      });
      await newUser.save();
      return res.status(201).json({ message: 'User registered successfully' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login endpoint with rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('Login attempt:', {
      method: req.method,
      path: req.path,
      body: { email: req.body.email, passwordPresent: !!req.body.password }
    });
    
    const { email, password } = req.body;
    
    // Find user
    let user = await User.findOne({ email });
    let userType = 'user';
    
    if (!user) {
      user = await Admin.findOne({ email });
      userType = 'admin';
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token with consistent user property structure
    const payload = { 
      user: { 
        id: user._id.toString(),
        role: userType 
      } 
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Created token for user ID:', user._id.toString());

    // Set cookie with proper security settings for deployment
    res.cookie("token", token, {
      httpOnly: true,     
      secure: NODE_ENV === "production",  
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Log response headers before sending
    console.log('Response headers:', res.getHeaders());
    
    // Return user data
    res.status(200).json({
      message: 'User logged in successfully',
      token, // Include token for backward compatibility
      userId: user._id.toString(),
      username: user.username,
      role: userType,
      adminName: user.adminName,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user ID by username
router.get('/getUserId/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Sanitize username
    const sanitizedUsername = username.trim();
    
    const user = await User.findOne({ username: sanitizedUsername });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ userId: user._id });
  } catch (error) {
    console.error("Error fetching userId:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
