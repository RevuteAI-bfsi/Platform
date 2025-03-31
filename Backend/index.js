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

const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(
  cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

app.use(express.static(path.join(__dirname, '../client/dist')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", require("./Routes/UserRoute"));
app.use("/api/report", require("./Routes/ReportRoute"));
app.use("/api/leaderboard", require("./Routes/LeaderboardRoute"));
app.use("/api/trainingPage", require("./Routes/TrainingPage"));
app.use("/api/admin", require("./Routes/AdminRoutes"));
app.use("/api/profile", require("./Routes/ProfileRoute"));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Second MongoDB connection endpoints commented out
/*
app.get('/api/debug/retail-training/:userId', async (req, res) => {
  try {
    const collection = secondDb.collection('user_retail_training');
    const result = await collection.findOne({ user_id: req.params.userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profile/retail-training/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Fetching retail training data for user ID: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Log available collections to verify the collection exists
    const collections = await secondDb.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));

    const collection = secondDb.collection('user_retail_training');
    
    // Log document count to verify collection has data
    const count = await collection.countDocuments();
    console.log(`Total documents in collection: ${count}`);
    
    // Find the document by user_id as string
    console.log(`Searching for document with user_id: ${userId}`);
    const userData = await collection.findOne({ user_id: userId });
    
    console.log("Raw user data found:", userData);
    
    if (!userData) {
      console.log(`No retail training data found for user: ${userId}`);
      return res.json({ 
        user_id: userId,
        scenarios: [] 
      });
    }
    
    // Ensure the data structure is complete
    if (!userData.scenarios) {
      userData.scenarios = [];
    }
    
    console.log(`Found ${userData.scenarios.length} scenarios for user`);
    
    // Return the document with minimal processing
    res.json(userData);
  } catch (error) {
    console.error('Error fetching retail training data:', error);
    res.status(500).json({ message: 'Server error retrieving retail training data' });
  }
});
*/

// const apiKey = process.env.GEMINI_API_KEY;
// const modelName = process.env.GEMINI_MODEL;

// const genAI = new GoogleGenerativeAI(apiKey);
// const model = genAI.getGenerativeModel({ model: modelName });
// const GEMINI_URL =
//   "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
//   apiKey;

// const uploadDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const timestamp = Date.now();
//     const ext = path.extname(file.originalname);
//     cb(null, `${file.fieldname}-${timestamp}${ext}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ["video/webm", "audio/webm", "video/mp4", "audio/mp3"];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type"), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 50 * 1024 * 1024,
//   },
// }).fields([
//   { name: "videoFile", maxCount: 1 },
//   { name: "audioFile", maxCount: 1 },
// ]);

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// async function analyzeWithGemini(text) {
//   return {};
// }

// function analyzeEmotions(emotionData) {
//   return { Neutral: "100.0" };
// }

app.post("/api/chat", async (req, res) => {
  try {
    const { userMessage } = req.body;

    const response = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: userMessage }] }]
    });

    const botReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
    res.json({ botReply });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB (Mongoose) connected successfully!");
    // Starting the server without second DB connection
    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
    // connectSecondDatabaseAndStartServer();  // Second DB connection commented out
  })
  .catch((err) => {
    console.error("Error connecting to first MongoDB:", err);
  });

/*
//  CONNECT SECOND DB
const secondMongoURI = process.env.SECOND_MONGO_URI;
let secondDb = null;

function connectSecondDatabaseAndStartServer() {
  MongoClient.connect(MONGODB_URI)
    .then((client) => {
      console.log("Connected to second MongoDB (usersDB)");
      secondDb = client.db("test");

      secondDb
        .listCollections()
        .toArray()
        .then((collections) => {
          const collectionNames = collections.map((c) => c.name);
          if (!collectionNames.includes("notifications")) {
            secondDb
              .createCollection("notifications")
              .then(() => {
                console.log("Created notifications collection in second DB");
                secondDb
                  .collection("notifications")
                  .createIndex({ timestamp: -1 });
                secondDb.collection("notifications").createIndex({ read: 1 });
              })
              .catch((err) =>
                console.error("Error creating notifications collection:", err)
              );
          }
        })
        .catch((err) =>
          console.error("Error listing collections in second DB:", err)
        );
      app.use(express.static("public"));

      app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? err.message
              : "Something went wrong",
        });
      });

      app.listen(PORT, () => {
        console.log(`Server running on port: ${PORT}`);
        console.log(`Both DB connections established successfully.`);
      });
    })
    .catch((err) => {
      console.error("Error connecting to second MongoDB:", err);
    });
}
*/
