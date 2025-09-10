const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, walletAddress, role } = req.body;

    // Hardcoded admin emails with full rights
    const adminEmails = ['admin@landregistry.com', 'superadmin@landregistry.com'];
    const isHardcodedAdmin = adminEmails.includes(email.toLowerCase());
    
    // Determine role - only allow ADMIN for hardcoded emails
    const userRole = isHardcodedAdmin ? 'ADMIN' : 'USER';
    
    // Check if user already exists
    const query = { email };
    if (walletAddress) {
      query.$or = [{ email }, { walletAddress }];
    }
    
    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email 
          ? 'User already exists with this email address'
          : 'User already exists with this wallet address'
      });
    }

    // Create new user
    const userData = {
      fullName,
      email,
      password,
      role: userRole
    };
    
    // Add wallet address if provided
    if (walletAddress) {
      userData.walletAddress = walletAddress;
    }
    
    const user = new User(userData);

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ 
        message: `User already exists with this ${field === 'walletAddress' ? 'wallet address' : field}` 
      });
    } else {
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;

    // Build query - prioritize email if provided
    let query = {};
    if (email) {
      query.email = email;
    } else if (walletAddress) {
      query.walletAddress = walletAddress;
    } else {
      return res.status(400).json({ message: 'Email or wallet address is required' });
    }
    
    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('ownedProperties');
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify wallet address
router.post('/verify-wallet', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    // In a real implementation, you would verify the signature here
    // using ethers.js verifyMessage function
    
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Wallet verified successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({ message: 'Server error during wallet verification' });
  }
});

module.exports = router;