const express = require('express');
const multer = require('multer');
const LandTransaction = require('../models/LandTransaction');
const Chat = require('../models/Chat');
const Land = require('../models/Land');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');
const QRCode = require('qrcode');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initiate land transaction
router.post('/initiate', auth, async (req, res) => {
  try {
    const { chatId } = req.body;
    
    const chat = await Chat.findById(chatId)
      .populate('landId')
      .populate('buyer')
      .populate('seller');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.status !== 'DEAL_AGREED') {
      return res.status(400).json({ message: 'Deal must be agreed upon before initiating transaction' });
    }

    // Check if user is part of this chat
    if (chat.buyer._id.toString() !== req.user._id.toString() && 
        chat.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if transaction already exists
    const existingTransaction = await LandTransaction.findOne({ chatId });
    if (existingTransaction) {
      return res.status(400).json({ message: 'Transaction already initiated for this deal' });
    }

    const transaction = new LandTransaction({
      landId: chat.landId._id,
      chatId: chat._id,
      seller: chat.seller._id,
      buyer: chat.buyer._id,
      agreedPrice: chat.agreedPrice,
      transactionType: 'SALE'
    });

    await transaction.save();

    // Update land status
    const land = await Land.findById(chat.landId._id);
    land.status = 'UNDER_TRANSACTION';
    await land.save();

    // Update chat status
    chat.status = 'COMPLETED';
    await chat.save();

    res.json({
      message: 'Land transaction initiated successfully',
      transaction
    });
  } catch (error) {
    console.error('Initiate transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit transaction documents
router.post('/:transactionId/documents', auth, upload.array('documents'), async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user is part of this transaction
    if (transaction.buyer.toString() !== req.user._id.toString() && 
        transaction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const documents = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
        documents.push({
          type: file.originalname.split('.')[0].toUpperCase(),
          url: ipfsService.getFileUrl(ipfsHash),
          ipfsHash,
          uploadedBy: req.user._id
        });
      }
    }

    transaction.documents.push(...documents);
    transaction.status = 'DOCUMENTS_SUBMITTED';
    await transaction.save();

    res.json({
      message: 'Documents submitted successfully',
      documents
    });
  } catch (error) {
    console.error('Submit documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending transactions for admin review
router.get('/pending-review', adminAuth, async (req, res) => {
  try {
    const transactions = await LandTransaction.find({
      status: { $in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
    })
    .populate('landId', 'assetId village district state area')
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
    const { action, comments, rejectionReason } = req.body; // action: 'approve' or 'reject'
    
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
          stampDuty: transaction.agreedPrice * 0.05, // 5% stamp duty
          registrationFee: 1000 // Fixed registration fee
        }
      };

      // Update land ownership
      land.currentOwner = transaction.buyer._id;
      land.status = 'AVAILABLE';
      land.marketInfo.isForSale = false;
      
      // Add to ownership history
      land.ownershipHistory.push({
        owner: transaction.buyer._id,
        fromDate: new Date(),
        documentReference: transaction._id.toString()
      });

      // Update digital document
      land.digitalDocument = {
        qrCode: qrCodeDataURL,
        certificateUrl: ipfsService.getFileUrl(certificateHash),
        ipfsHash: certificateHash,
        generatedDate: new Date(),
        isDigitalized: true
      };

      await land.save();

      // Update user's owned properties
      const buyer = await User.findById(transaction.buyer._id);
      const seller = await User.findById(transaction.seller._id);
      
      buyer.ownedProperties.push(land._id);
      seller.ownedProperties = seller.ownedProperties.filter(
        propId => propId.toString() !== land._id.toString()
      );
      
      await buyer.save();
      await seller.save();

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

// Verify ownership certificate
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId', 'assetId village district state')
      .populate('buyer', 'fullName email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Transaction not completed' });
    }

    res.json({
      isValid: true,
      transaction: {
        id: transaction._id,
        landAssetId: transaction.landId.assetId,
        currentOwner: transaction.buyer.fullName,
        completionDate: transaction.completionDetails.completedDate,
        registrationNumber: transaction.completionDetails.registrationDetails.registrationNumber,
        certificateUrl: transaction.completionDetails.newOwnershipDocument.certificateUrl
      }
    });
  } catch (error) {
    console.error('Verify ownership error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;