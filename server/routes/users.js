const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Submit verification documents
router.post('/verification/submit', auth, upload.fields([
  { name: 'panCard', maxCount: 1 },
  { name: 'aadhaarCard', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'passport', maxCount: 1 }
]), async (req, res) => {
  try {
    const { panNumber, aadhaarNumber, dlNumber, passportNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already verified
    if (user.verificationStatus === 'VERIFIED') {
      return res.status(400).json({ message: 'User is already verified' });
    }

    const verificationDocuments = {};

    // Upload PAN card
    if (req.files.panCard && panNumber) {
      try {
        const panFile = req.files.panCard[0];
        const panHash = await ipfsService.uploadFile(panFile.buffer, panFile.originalname);
        verificationDocuments.panCard = {
          number: panNumber,
          documentUrl: ipfsService.getFileUrl(panHash),
          verified: false
        };
      } catch (uploadError) {
        console.error('PAN card upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload PAN card' });
      }
    }

    // Upload Aadhaar card
    if (req.files.aadhaarCard && aadhaarNumber) {
      try {
        const aadhaarFile = req.files.aadhaarCard[0];
        const aadhaarHash = await ipfsService.uploadFile(aadhaarFile.buffer, aadhaarFile.originalname);
        verificationDocuments.aadhaarCard = {
          number: aadhaarNumber,
          documentUrl: ipfsService.getFileUrl(aadhaarHash),
          verified: false
        };
      } catch (uploadError) {
        console.error('Aadhaar card upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload Aadhaar card' });
      }
    }

    // Upload Driving License
    if (req.files.drivingLicense && dlNumber) {
      try {
        const dlFile = req.files.drivingLicense[0];
        const dlHash = await ipfsService.uploadFile(dlFile.buffer, dlFile.originalname);
        verificationDocuments.drivingLicense = {
          number: dlNumber,
          documentUrl: ipfsService.getFileUrl(dlHash),
          verified: false
        };
      } catch (uploadError) {
        console.error('Driving license upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload driving license' });
      }
    }

    // Upload Passport
    if (req.files.passport && passportNumber) {
      try {
        const passportFile = req.files.passport[0];
        const passportHash = await ipfsService.uploadFile(passportFile.buffer, passportFile.originalname);
        verificationDocuments.passport = {
          number: passportNumber,
          documentUrl: ipfsService.getFileUrl(passportHash),
          verified: false
        };
      } catch (uploadError) {
        console.error('Passport upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload passport' });
      }
    }

    // Check if at least one document was uploaded
    if (Object.keys(verificationDocuments).length === 0) {
      return res.status(400).json({ 
        message: 'At least one verification document is required' 
      });
    }

    user.verificationDocuments = { ...user.verificationDocuments, ...verificationDocuments };
    user.verificationStatus = 'PENDING';
    await user.save();

    res.json({
      message: 'Verification documents submitted successfully',
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    console.error('Document submission error:', error);
    res.status(500).json({ 
      message: 'Failed to submit verification documents',
      error: error.message 
    });
  }
});

// Get pending verifications (Admin only)
router.get('/verification/pending', adminAuth, async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      verificationStatus: 'PENDING',
      role: 'USER'
    }).select('-password');

    res.json({ users: pendingUsers });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify user (Admin only)
router.put('/verification/:userId/verify', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason, verifiedDocuments } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verificationStatus = status;
    user.verifiedBy = req.user._id;
    user.verificationDate = new Date();

    if (status === 'REJECTED') {
      user.rejectionReason = rejectionReason;
    } else if (status === 'VERIFIED') {
      // Mark specific documents as verified
      if (verifiedDocuments) {
        Object.keys(verifiedDocuments).forEach(docType => {
          if (user.verificationDocuments[docType]) {
            user.verificationDocuments[docType].verified = verifiedDocuments[docType];
          }
        });
      }
    }

    await user.save();

    res.json({
      message: `User ${status.toLowerCase()} successfully`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    console.error('User verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all verified users (Admin only)
router.get('/verified', adminAuth, async (req, res) => {
  try {
    const verifiedUsers = await User.find({ 
      verificationStatus: 'VERIFIED',
      role: 'USER'
    }).select('-password -verificationDocuments');

    res.json({ users: verifiedUsers });
  } catch (error) {
    console.error('Get verified users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;