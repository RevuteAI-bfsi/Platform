const express = require('express');
const router = express.Router();
const User = require('../Model/UserSchema');
const Profile = require('../Model/ProfileSchema');
const multer = require('multer');
const bcrypt = require('bcrypt');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/profileFetchUser/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('username email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = await Profile.findOne({ user: userId }).select('phone profileImage');
    let profileImage = '';
    // If an image exists, convert the binary data to a base64 string
    if (profile && profile.profileImage && profile.profileImage.data) {
      profileImage = `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString('base64')}`;
    }
    res.json({ 
      username: user.username, 
      email: user.email, 
      phone: profile ? profile.phone : '', 
      profileImage: profileImage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/updateProfileInfo', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId, phone, username, email } = req.body;
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      profile = new Profile({ user: userId, phone });
    } else {
      profile.phone = phone;
    }
    // Update profile image if file is provided
    if (req.file) {
      profile.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    await profile.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/updatePassword/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
