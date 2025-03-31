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
  res.send("Welcome to the backend server NodeJs!");
});

// Create a reference to the retail training collection
// This will use the existing mongoose connection
const getRetailTrainingCollection = () => {
  return mongoose.connection.db.collection('user_retail_training');
};

app.get('/api/debug/retail-training/:userId', async (req, res) => {
  try {
    const collection = getRetailTrainingCollection();
    const result = await collection.findOne({ user_id: req.params.userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profile/retail-training/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    // console.log(`Fetching retail training data for user ID: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const collection = getRetailTrainingCollection();
    
    // Log available collections to verify the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    // console.log("Available collections:", collections.map(c => c.name));
    
    // Log document count to verify collection has data
    const count = await collection.countDocuments();
    // console.log(`Total documents in collection: ${count}`);
    
    // Find the document by user_id as string
    // console.log(`Searching for document with user_id: ${userId}`);
    const userData = await collection.findOne({ user_id: userId });
    
   
    
    
    if (!userData) {
      // console.log(`No retail training data found for user: ${userId}`);
      return res.json({ 
        user_id: userId,
        scenarios: [] 
      });
    }
    
    // Ensure the data structure is complete
    if (!userData.scenarios) {
      userData.scenarios = [];
    }
    
    // console.log(`Found ${userData.scenarios.length} scenarios for user`);
    
    // Return the document with minimal processing
    res.json(userData);
  } catch (error) {
    console.error('Error fetching retail training data:', error);
    res.status(500).json({ message: 'Server error retrieving retail training data' });
  }
});

// Removed the Gemini API configuration that was commented out

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

// Only use one MongoDB connection using Mongoose
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB (Mongoose) connected successfully!");
    
    // Check if retail training collection exists
    mongoose.connection.db.listCollections({name: 'user_retail_training'})
      .next((err, collinfo) => {
        if (!collinfo) {
          console.log('Creating user_retail_training collection...');
          mongoose.connection.db.createCollection('user_retail_training')
            .then(() => console.log('user_retail_training collection created successfully'))
            .catch(err => console.error('Error creating collection:', err));
        } else {
          console.log('user_retail_training collection already exists');
        }
      });
    
    // Start the server after MongoDB connection is established
    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });