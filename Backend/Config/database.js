const mongoose = require("mongoose");

const connectDB = async (MONGODB_URI) => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB (Mongoose) connected successfully!");
        
        // Check if retail training collection exists
        const collections = await mongoose.connection.db.listCollections({name: 'user_retail_training'}).toArray();
        if (collections.length === 0) {
            console.log('Creating user_retail_training collection...');
            await mongoose.connection.db.createCollection('user_retail_training');
            console.log('user_retail_training collection created successfully');
        } else {
            console.log('user_retail_training collection already exists');
        }
        
        return mongoose.connection;
    } catch (error) {
        console.error("DATABASE connection error:", error);
        throw error; // Re-throw the error to handle it in the calling code
    }
};

module.exports = connectDB;