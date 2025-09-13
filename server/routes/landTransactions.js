const express = require('express');
const multer = require('multer');
const LandTransaction = require('../models/LandTransaction');
const DigitizedLand = require('../models/DigitizedLand');
const User = require('../models/User');
const Chat = require('../models/Chat');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');
const QRCode = require('qrcode');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initiate land purchase (from marketplace or chat)
router.post('/purchase', auth, async (req, res) => {
  try {
    const { landId, offerPrice, chatId } = req.body;

    if (!landId || !offerPrice) {
      return res.status(400).json({ 
        message: 'Land ID and offer price are required' 
      });
    }

    const land = await DigitizedLand.findById(landId).populate('currentOwner');
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.marketInfo.isForSale) {
      return res.status(400).json({ message: 'Land is not for sale' });
    }

    if (land.currentOwner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot buy your own land' });
    }

    const buyer = await User.findById(req.user._id);
    if (!buyer.canClaimLand()) {
      return res.status(403).json({ 
        message: 'You must be verified to purchase land' 
      });
    }

    // Check if there's already a pending transaction for this land
    const existingTransaction = await LandTransaction.findOne({
      landId: land._id,
      status: { $in: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        message: 'There is already a pending transaction for this land' 
      });
    }

    // Create transaction
    const transaction = new LandTransaction({
      landId: land._id,
      seller: land.currentOwner._id,
      buyer: req.user._id,
      agreedPrice: parseFloat(offerPrice),
      transactionType: 'SALE',
      status: 'INITIATED',
      chatId: chatId || null,
      metadata: {
        initiatedFrom: chatId ? 'CHAT' : 'MARKETPLACE',
        estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    // Add initial timeline event
    transaction.addTimelineEvent('INITIATED', req.user._id, 'Transaction initiated by buyer');

    await transaction.save();

    // Update land status
    land.status = 'UNDER_TRANSACTION';
    await land.save();

    // Update chat status if transaction originated from chat
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.status = 'TRANSACTION_INITIATED';
        chat.transactionId = transaction._id;
        await chat.save();
      }
    }

    console.log(`Land purchase initiated: ${land.landId} by ${buyer.email}`);

    res.json({
      message: 'Purchase request initiated successfully',
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        agreedPrice: transaction.agreedPrice
      }
    });
  } catch (error) {
    console.error('Purchase initiation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit transaction documents
router.post('/:transactionId/documents', auth, upload.array('documents'), async (req, res) => {
  try {
    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId seller buyer');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user is part of this transaction
    const isParticipant = transaction.seller._id.toString() === req.user._id.toString() || 
                         transaction.buyer._id.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['INITIATED', 'DOCUMENTS_SUBMITTED'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Cannot submit documents at this stage' });
    }

    // Upload documents to IPFS
    const uploadedDocuments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
          uploadedDocuments.push({
            documentType: 'OTHER', // You can enhance this to detect document type
            documentName: file.originalname,
            documentUrl: ipfsService.getFileUrl(ipfsHash),
            ipfsHash,
            uploadedBy: req.user._id,
            uploadDate: new Date()
          });
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
        }
      }
    }

    // Add documents to transaction
    transaction.documents.push(...uploadedDocuments);
    transaction.status = 'DOCUMENTS_SUBMITTED';

    // Add timeline event
    transaction.addTimelineEvent(
      'DOCUMENTS_UPLOADED', 
      req.user._id, 
      `${uploadedDocuments.length} documents uploaded by ${req.user._id.toString() === transaction.buyer._id.toString() ? 'buyer' : 'seller'}`
    );

    await transaction.save();

    console.log(`Documents submitted for transaction ${transaction.transactionId}`);

    res.json({
      message: 'Documents submitted successfully',
      documentsUploaded: uploadedDocuments.length
    });
  } catch (error) {
    console.error('Document submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending transactions for admin review
router.get('/pending-review', adminAuth, async (req, res) => {
  try {
    const transactions = await LandTransaction.findPendingReview()
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
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or reject' });
    }

    const transaction = await LandTransaction.findById(req.params.transactionId)
      .populate('landId seller buyer');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (!transaction.canBeApproved() && action === 'approve') {
      return res.status(400).json({ message: 'Transaction cannot be approved at this time' });
    }

    if (!transaction.canBeRejected() && action === 'reject') {
      return res.status(400).json({ message: 'Transaction cannot be rejected at this time' });
    }

    // Update admin review
    transaction.adminReview = {
      reviewedBy: req.user._id,
      reviewDate: new Date(),
      reviewStatus: 'COMPLETED',
      comments,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      documentsVerified: action === 'approve',
      legalClearance: action === 'approve',
      financialVerification: action === 'approve'
    };

    if (action === 'approve') {
      await approveTransaction(transaction, req.user._id);
    } else {
      await rejectTransaction(transaction, req.user._id, rejectionReason);
    }

    console.log(`Transaction ${transaction.transactionId} ${action}d by admin ${req.user.email}`);

    res.json({
      message: `Transaction ${action}d successfully`,
      transaction
    });
  } catch (error) {
    console.error('Review transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to approve transaction
async function approveTransaction(transaction, adminId) {
  const land = transaction.landId;
  const newOwner = transaction.buyer;
  const oldOwner = transaction.seller;

  // Generate QR code for new ownership
  const qrData = {
    landId: land.landId,
    owner: newOwner.fullName,
    transactionId: transaction.transactionId,
    verifyUrl: `${process.env.FRONTEND_URL}/verify-ownership/${transaction._id}`
  };
  
  const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
  
  // Generate transaction certificate
  const transactionCertificatePDF = await PDFGenerator.generateTransactionCertificate(
    transaction, 
    land, 
    qrCodeDataURL
  );
  
  const transactionCertificateHash = await ipfsService.uploadFile(
    Buffer.from(transactionCertificatePDF),
    `transaction-certificate-${transaction.transactionId}.pdf`
  );

  // Generate new ownership certificate
  const ownershipCertificatePDF = await PDFGenerator.generateOwnershipCertificate(
    transaction, 
    land, 
    newOwner,
    qrCodeDataURL
  );
  
  const ownershipCertificateHash = await ipfsService.uploadFile(
    Buffer.from(ownershipCertificatePDF),
    `ownership-certificate-${land.landId}-${Date.now()}.pdf`
  );

  // Update transaction completion details
  transaction.completionDetails = {
    completedDate: new Date(),
    registrationNumber: `REG-${Date.now()}`,
    registrationDate: new Date(),
    registrationOffice: `${land.landDetails.district} Sub-Registrar Office`,
    stampDuty: transaction.agreedPrice * 0.05, // 5% stamp duty
    registrationFee: 1000, // Fixed registration fee
    totalCharges: (transaction.agreedPrice * 0.05) + 1000,
    
    transactionCertificate: {
      certificateUrl: ipfsService.getFileUrl(transactionCertificateHash),
      qrCode: qrCodeDataURL,
      ipfsHash: transactionCertificateHash
    },
    
    newOwnershipDocument: {
      certificateUrl: ipfsService.getFileUrl(ownershipCertificateHash),
      qrCode: qrCodeDataURL,
      ipfsHash: ownershipCertificateHash
    }
  };

  transaction.status = 'COMPLETED';

  // Add timeline event
  transaction.addTimelineEvent('COMPLETED', adminId, 'Transaction approved and completed by admin');

  await transaction.save();

  // Update land ownership
  const oldOwnerUser = await User.findById(oldOwner._id);
  const newOwnerUser = await User.findById(newOwner._id);

  // Remove from old owner
  if (oldOwnerUser) {
    oldOwnerUser.ownedLands = oldOwnerUser.ownedLands.filter(
      landId => landId.toString() !== land._id.toString()
    );
    await oldOwnerUser.save();
  }

  // Add to new owner
  newOwnerUser.ownedLands.push(land._id);
  await newOwnerUser.save();

  // Update land ownership and status
  land.addOwnershipRecord(newOwner._id, 'SALE', transaction.transactionId);
  land.status = 'AVAILABLE';
  land.marketInfo.isForSale = false;

  await land.save();

  // Update chat status if exists
  if (transaction.chatId) {
    const chat = await Chat.findById(transaction.chatId);
    if (chat) {
      chat.status = 'COMPLETED';
      await chat.save();
    }
  }
}

// Helper function to reject transaction
async function rejectTransaction(transaction, adminId, rejectionReason) {
  transaction.status = 'REJECTED';
  
  // Add timeline event
  transaction.addTimelineEvent('REJECTED', adminId, `Transaction rejected: ${rejectionReason}`);

  await transaction.save();

  // Update land status back to for sale
  const land = await DigitizedLand.findById(transaction.landId._id);
  land.status = 'FOR_SALE';
  await land.save();

  // Update chat status if exists
  if (transaction.chatId) {
    const chat = await Chat.findById(transaction.chatId);
    if (chat) {
      chat.status = 'ACTIVE';
      chat.transactionId = null;
      await chat.save();
    }
  }
}

// Get user's transactions
router.get('/my-transactions', auth, async (req, res) => {
  try {
    const transactions = await LandTransaction.findByUser(req.user._id)
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
      .populate('landId seller buyer')
      .populate('adminReview.reviewedBy', 'fullName')
      .populate('documents.uploadedBy', 'fullName')
      .populate('timeline.performedBy', 'fullName');

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
      .populate('landId buyer seller');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Transaction is not completed' });
    }

    res.json({
      isValid: true,
      transaction: {
        transactionId: transaction.transactionId,
        landId: transaction.landId.landId,
        buyer: transaction.buyer.fullName,
        seller: transaction.seller.fullName,
        agreedPrice: transaction.agreedPrice,
        completedDate: transaction.completionDetails.completedDate,
        registrationNumber: transaction.completionDetails.registrationNumber
      }
    });
  } catch (error) {
    console.error('Verify ownership error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction statistics (Admin only)
router.get('/admin/statistics', adminAuth, async (req, res) => {
  try {
    const stats = await LandTransaction.getStatistics();
    const currentYear = new Date().getFullYear();
    const monthlyStats = await LandTransaction.getMonthlyStats(currentYear);
    
    res.json({
      statistics: stats,
      monthlyStats
    });
  } catch (error) {
    console.error('Get transaction statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;