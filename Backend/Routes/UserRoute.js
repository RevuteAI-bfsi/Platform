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

  if (!username || !email || !password || !confirmPassword) {
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

    // Check if the username follows the product key pattern
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
      // Store admin in Admin model
      const newAdmin = new Admin({
        username: finalUsername,
        email,
        password: hashedPassword,
        role: finalRole,
      });
      await newAdmin.save();
      return res.status(201).json({ message: 'Admin registered successfully' });
    } else {
      // Ensure adminName exists in Admin model before saving user
      if (finalAdminName) {
        const existingAdmin = await Admin.findOne({ username: finalAdminName });
        if (!existingAdmin) {
          return res.status(400).json({ message: 'Admin name does not exist' });
        }
      }

      // Store user in User model
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
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
  res.status(200).json({
    message: 'User logged in successfully',
    token,
    userId: user._id,
    username: user.username,
    role: userType
  })
})

module.exports = router
