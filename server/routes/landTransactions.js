const express = require('express');
const multer = require('multer');
const LandTransaction = require('../models/LandTransaction');
const Land = require('../models/Land');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');
const QRCode = require('qrcode');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get pending transactions for admin review
router.get('/pending-review', adminAuth, async (req, res) => {
  try {
    const transactions = await LandTransaction.find({
      status: { $in: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
    })
    .populate('landId', 'assetId village district state area marketInfo')
    .populate('buyer', 'fullName email')
    .populate('seller', 'fullName email')
    .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review transaction (Admin only)
router.put('/:transactionId/review', adminAuth, async (req, res) => {
  try {
    const { action, comments, rejectionReason } = req.body;
    
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId')
      .populate('buyer')
      .populate('seller');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.adminReview = {
      reviewedBy: req.user._id,
      reviewDate: new Date(),
      comments,
      rejectionReason: action === 'reject' ? rejectionReason : undefined
    };

    if (action === 'approve') {
      transaction.status = 'APPROVED';
      
      // Generate new ownership document
      const land = transaction.landId;
      
      // Generate QR code for new ownership
      const qrData = {
        assetId: land.assetId,
        owner: transaction.buyer.fullName,
        transactionId: transaction._id,
        verifyUrl: `${process.env.FRONTEND_URL}/verify-ownership/${transaction._id}`
      };
      
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
      
      // Generate new ownership certificate
      const certificatePDF = await PDFGenerator.generateOwnershipCertificate(
        transaction, 
        land, 
        transaction.buyer,
        qrCodeDataURL
      );
      
      const certificateHash = await ipfsService.uploadFile(
        Buffer.from(certificatePDF),
        `ownership-certificate-${land.assetId}-${Date.now()}.pdf`
      );

      transaction.completionDetails = {
        completedDate: new Date(),
        newOwnershipDocument: {
          certificateUrl: ipfsService.getFileUrl(certificateHash),
          qrCode: qrCodeDataURL,
          ipfsHash: certificateHash
        },
        registrationDetails: {
          registrationNumber: `REG-${Date.now()}`,
          registrationDate: new Date(),
          registrationOffice: `${land.district} Sub-Registrar Office`,
          stampDuty: transaction.agreedPrice * 0.05,
          registrationFee: 1000
        }
      };

      // Update land ownership
      const oldOwner = await User.findById(land.currentOwner);
      const newOwner = await User.findById(transaction.buyer._id);

      // Remove from old owner
      if (oldOwner) {
        oldOwner.ownedLands = oldOwner.ownedLands.filter(
          landId => landId.toString() !== land._id.toString()
        );
        await oldOwner.save();
      }

      // Add to new owner
      newOwner.ownedLands.push(land._id);
      await newOwner.save();

      // Update land
      land.currentOwner = transaction.buyer._id;
      land.status = 'AVAILABLE';
      land.marketInfo.isForSale = false;
      
      // Add to ownership history
      land.ownershipHistory.push({
        owner: transaction.buyer._id,
        fromDate: new Date(),
        documentReference: transaction._id.toString()
      });

      await land.save();
      transaction.status = 'COMPLETED';

    } else if (action === 'reject') {
      transaction.status = 'REJECTED';
      
      // Update land status back to for sale
      const land = await Land.findById(transaction.landId._id);
      land.status = 'FOR_SALE';
      await land.save();
    }

    await transaction.save();

    res.json({
      message: `Transaction ${action}d successfully`,
      transaction
    });
  } catch (error) {
    console.error('Review transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's transactions
router.get('/my-transactions', auth, async (req, res) => {
  try {
    const transactions = await LandTransaction.find({
      $or: [
        { buyer: req.user._id },
        { seller: req.user._id }
      ]
    })
    .populate('landId', 'assetId village district state')
    .populate('buyer', 'fullName email')
    .populate('seller', 'fullName email')
    .populate('adminReview.reviewedBy', 'fullName')
    .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction details
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId')
      .populate('buyer', 'fullName email')
      .populate('seller', 'fullName email')
      .populate('adminReview.reviewedBy', 'fullName')
      .populate('documents.uploadedBy', 'fullName');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access rights
    const hasAccess = transaction.buyer._id.toString() === req.user._id.toString() ||
                     transaction.seller._id.toString() === req.user._id.toString() ||
                     req.user.role === 'ADMIN';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;