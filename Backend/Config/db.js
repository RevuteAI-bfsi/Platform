const mongoose = require("mongoose");

const connectDB = async (MONGODB_URI) => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("DB CONNECTED");
    } catch (error) {
        console.error("DATABASE connection error:", error);
    }
};

module.exports = connectDB;
