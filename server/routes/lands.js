const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const Land = require('../models/Land');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add land to database (Admin only)
router.post('/add', adminAuth, upload.array('documents'), async (req, res) => {
  try {
    const {
      surveyNumber,
      subDivision,
      village,
      taluka,
      district,
      state,
      pincode,
      area,
      boundaries,
      landType,
      classification,
      ownerName,
      ownershipHistory
    } = req.body;

    // Upload documents to IPFS
    const documents = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
        documents.push({
          type: 'OTHER', // This would be determined based on file name or user input
          documentNumber: `DOC-${Date.now()}`,
          date: new Date(),
          documentUrl: ipfsService.getFileUrl(ipfsHash),
          ipfsHash
        });
      }
    }

    const land = new Land({
      surveyNumber,
      subDivision,
      village,
      taluka,
      district,
      state,
      pincode,
      area: JSON.parse(area),
      boundaries: JSON.parse(boundaries),
      landType,
      classification,
      originalDocuments: documents,
      ownershipHistory: ownerName ? [{
        ownerName,
        fromDate: new Date(),
        documentReference: 'INITIAL_RECORD'
      }] : [],
      addedBy: req.user._id
    });

    await land.save();

    res.status(201).json({
      message: 'Land added to database successfully',
      land: {
        id: land._id,
        assetId: land.assetId,
        surveyNumber: land.surveyNumber,
        village: land.village,
        district: land.district,
        state: land.state
      }
    });
  } catch (error) {
    console.error('Add land error:', error);
    res.status(500).json({ message: 'Failed to add land to database' });
  }
});

// Get all lands (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      district, 
      state, 
      landType, 
      isForSale, 
      assetId,
      village 
    } = req.query;

    const query = {};
    if (district) query.district = new RegExp(district, 'i');
    if (state) query.state = new RegExp(state, 'i');
    if (village) query.village = new RegExp(village, 'i');
    if (landType) query.landType = landType;
    if (isForSale === 'true') query['marketInfo.isForSale'] = true;
    if (assetId) query.assetId = assetId;

    const lands = await Land.find(query)
      .populate('currentOwner', 'fullName email')
      .populate('addedBy', 'fullName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Land.countDocuments(query);

    res.json({
      lands,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search land by asset ID
router.get('/search/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const land = await Land.findOne({ assetId })
      .populate('currentOwner', 'fullName email walletAddress')
      .populate('addedBy', 'fullName');

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    res.json({ land });
  } catch (error) {
    console.error('Search land error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim ownership (Verified users only)
router.post('/:landId/claim', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ message: 'User must be verified to claim land ownership' });
    }

    const land = await Land.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.currentOwner) {
      return res.status(400).json({ message: 'Land already has an owner' });
    }

    land.currentOwner = req.user._id;
    land.ownershipHistory.push({
      owner: req.user._id,
      fromDate: new Date(),
      documentReference: 'DIGITAL_CLAIM'
    });
    land.status = 'AVAILABLE';
    await land.save();

    // Add to user's owned properties
    user.ownedProperties.push(land._id);
    await user.save();

    res.json({
      message: 'Land ownership claimed successfully',
      land
    });
  } catch (error) {
    console.error('Claim ownership error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate digital document (Admin only)
router.post('/:landId/digitalize', adminAuth, async (req, res) => {
  try {
    const land = await Land.findById(req.params.landId)
      .populate('currentOwner', 'fullName email');

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    // Generate QR code
    const qrData = {
      assetId: land.assetId,
      owner: land.currentOwner?.fullName || 'Unassigned',
      verifyUrl: `${process.env.FRONTEND_URL}/verify-land/${land.assetId}`
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Generate digital ownership certificate
    const certificatePDF = await PDFGenerator.generateLandCertificate(land, qrCodeDataURL);
    const certificateHash = await ipfsService.uploadFile(
      Buffer.from(certificatePDF),
      `land-certificate-${land.assetId}.pdf`
    );

    // Update land with digital document info
    land.digitalDocument = {
      qrCode: qrCodeDataURL,
      certificateUrl: ipfsService.getFileUrl(certificateHash),
      ipfsHash: certificateHash,
      generatedDate: new Date(),
      isDigitalized: true
    };
    land.verificationStatus = 'VERIFIED';
    land.verifiedBy = req.user._id;

    await land.save();

    res.json({
      message: 'Land digitalized successfully',
      digitalDocument: land.digitalDocument
    });
  } catch (error) {
    console.error('Digitalization error:', error);
    res.status(500).json({ message: 'Failed to digitalize land document' });
  }
});

// List land for sale
router.post('/:landId/list-for-sale', auth, async (req, res) => {
  try {
    const { askingPrice, description, images } = req.body;
    const land = await Land.findById(req.params.landId);

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can list this land for sale' });
    }

    land.marketInfo = {
      isForSale: true,
      askingPrice: parseFloat(askingPrice),
      pricePerSqft: parseFloat(askingPrice) / land.area.sqft,
      listedDate: new Date(),
      description,
      images: images || []
    };
    land.status = 'FOR_SALE';

    await land.save();

    res.json({
      message: 'Land listed for sale successfully',
      land
    });
  } catch (error) {
    console.error('List for sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's owned lands
router.get('/my-lands', auth, async (req, res) => {
  try {
    const lands = await Land.find({ currentOwner: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ lands });
  } catch (error) {
    console.error('Get user lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get lands for sale
router.get('/for-sale', async (req, res) => {
  try {
    const { page = 1, limit = 20, minPrice, maxPrice, district, state } = req.query;
    
    const query = { 
      'marketInfo.isForSale': true,
      status: 'FOR_SALE'
    };
    
    if (minPrice) query['marketInfo.askingPrice'] = { $gte: parseFloat(minPrice) };
    if (maxPrice) {
      query['marketInfo.askingPrice'] = { 
        ...query['marketInfo.askingPrice'], 
        $lte: parseFloat(maxPrice) 
      };
    }
    if (district) query.district = new RegExp(district, 'i');
    if (state) query.state = new RegExp(state, 'i');

    const lands = await Land.find(query)
      .populate('currentOwner', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'marketInfo.listedDate': -1 });

    const total = await Land.countDocuments(query);

    res.json({
      lands,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get lands for sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;