const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../Model/UserSchema')
const Admin = require('../Model/AdminSchema')
const dotenv = require('dotenv')
dotenv.config()

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword, adminName } = req.body;
  if (!username || !email || !password || !confirmPassword || !adminName) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  try {
    let existingUser = await User.findOne({ email }) || await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'email already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
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
    console.error(error);
    res.status(500).json({ message: 'Username Already Exists' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  let user = await User.findOne({ email })
  let userType = 'user'
  if (!user) {
    user = await Admin.findOne({ email })
    userType = 'admin'
  }
  if (!user) {
    return res.status(400).json({ message: 'User does not exist' })
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.password)
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: 'Invalid credentials' })
  }
  const payload = { user: { id: user._id, role: userType } }
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

  res.cookie("token", token,{
    httpOnly: true,     
    secure: process.env.NODE_ENV === "production",  
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  
  res.status(200).json({
    message: 'User logged in successfully',
    token,
    userId: user._id,
    username: user.username,
    role: userType,
    adminName: user.adminName,
  })
})

router.get('/getUserId/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ userId: user._id });
  } catch (error) {
    console.error("Error fetching userId:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router
