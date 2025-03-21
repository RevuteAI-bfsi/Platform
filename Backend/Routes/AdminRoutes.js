const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../Model/UserSchema");
const Admin = require("../Model/AdminSchema");
const Profile = require("../Model/ProfileSchema")

router.get("/fetchUsers/:adminName", async (req, res) => {
  const { adminName } = req.params;

  try {
      const adminExists = await Admin.findOne({ username: adminName });
      if (!adminExists) {
          return res.status(404).json({ message: "Admin not found" });
      }
      const users = await User.find({ adminName }, 'username email');

      res.json(users);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching users." });
  }
});

router.post('/profile/:adminName', async (req, res) => {
  try {
    const userId = req.body.userId;

    const profile = await Profile.findOne({ user: userId }).populate('user');

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      phoneNumber: profile.phone,
      lastActivity: profile.lastActivity,
      profileImage: profile.profileImage,
      user: profile.user 
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

module.exports = router;