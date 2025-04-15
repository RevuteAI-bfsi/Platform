const express = require("express");
const router = express.Router();
const authMiddleware = require('../Middleware/Auth');

const getBankingTrainingCollection = () => {
    return mongoose.connection.db.collection('user_banking_training');
};

router.get('/banking-training',authMiddleware, async (req, res) => {
    try {
      const userId = req.user.user.id;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const collection = getBankingTrainingCollection();
      const collections = await mongoose.connection.db.listCollections().toArray();
      const count = await collection.countDocuments();
      const userData = await collection.findOne({ user_id: userId });
      if (!userData) {
        return res.json({ 
          user_id: userId,
          scenarios: [] 
        });
      }
      if (!userData.scenarios) {
        userData.scenarios = [];
      }
      res.json(userData);
    } catch (error) {
      console.error('Error fetching banking training data:', error);
      res.status(500).json({ message: 'Server error retrieving banking training data' });
    }
  });