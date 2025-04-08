const mongoose = require("mongoose");

const connectDB = async (MONGODB_URI) => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB (Mongoose) connected successfully!");
        
        // Check if banking training collection exists (updated from retail)
        const collections = await mongoose.connection.db.listCollections({name: 'user_banking_training'}).toArray();
        if (collections.length === 0) {
            console.log('Creating user_banking_training collection...');
            await mongoose.connection.db.createCollection('user_banking_training');
            console.log('user_banking_training collection created successfully');
        } else {
            console.log('user_banking_training collection already exists');
        }
        
        return mongoose.connection;
    } catch (error) {
        console.error("DATABASE connection error:", error);
        throw error; // Re-throw the error to handle it in the calling code
    }
};

module.exports = connectDB;