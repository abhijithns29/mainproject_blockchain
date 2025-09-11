const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const Land = require('../models/Land');
const User = require('../models/User');
const LandTransaction = require('../models/LandTransaction');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add land to database (Admin only)
router.post('/add', adminAuth, upload.array('documents'), async (req, res) => {
  try {
    console.log('Adding land to database...');
    console.log('Request body:', req.body);
    console.log('Files:', req.files?.length || 0);

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
      ownerName
    } = req.body;

    // Validate required fields
    if (!surveyNumber || !village || !taluka || !district || !state || !pincode || !landType) {
      return res.status(400).json({ 
        message: 'Missing required fields: surveyNumber, village, taluka, district, state, pincode, landType' 
      });
    }

    // Parse JSON strings if they exist
    let parsedArea = {};
    let parsedBoundaries = {};

    try {
      parsedArea = typeof area === 'string' ? JSON.parse(area) : area || {};
      parsedBoundaries = typeof boundaries === 'string' ? JSON.parse(boundaries) : boundaries || {};
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedArea = {};
      parsedBoundaries = {};
    }

    // Upload documents to IPFS
    const documents = [];
    if (req.files && req.files.length > 0) {
      console.log('Uploading documents to IPFS...');
      for (const file of req.files) {
        try {
          const ipfsHash = await ipfsService.uploadFile(file.buffer, file.originalname);
          documents.push({
            type: 'OTHER',
            documentNumber: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(),
            documentUrl: ipfsService.getFileUrl(ipfsHash),
            ipfsHash
          });
          console.log('Document uploaded:', file.originalname);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }

    // Create land record
    const landData = {
      surveyNumber,
      subDivision: subDivision || '',
      village,
      taluka,
      district,
      state,
      pincode,
      area: {
        acres: parseFloat(parsedArea.acres) || 0,
        guntas: parseFloat(parsedArea.guntas) || 0,
        sqft: parseFloat(parsedArea.sqft) || 0
      },
      boundaries: {
        north: parsedBoundaries.north || '',
        south: parsedBoundaries.south || '',
        east: parsedBoundaries.east || '',
        west: parsedBoundaries.west || ''
      },
      landType,
      classification: classification || undefined,
      originalDocuments: documents,
      ownershipHistory: ownerName ? [{
        ownerName,
        fromDate: new Date(),
        documentReference: 'INITIAL_RECORD'
      }] : [],
      addedBy: req.user._id,
      verificationStatus: 'PENDING'
    };

    console.log('Creating land with data:', landData);

    const land = new Land(landData);
    await land.save();

    console.log('Land saved successfully:', land.assetId);

    res.status(201).json({
      message: 'Land added to database successfully',
      land: {
        id: land._id,
        assetId: land.assetId,
        surveyNumber: land.surveyNumber,
        village: land.village,
        district: land.district,
        state: land.state,
        landType: land.landType
      }
    });
  } catch (error) {
    console.error('Add land error:', error);
    res.status(500).json({ 
      message: 'Failed to add land to database',
      error: error.message 
    });
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
      village,
      verificationStatus
    } = req.query;

    const query = {};
    if (district) query.district = new RegExp(district, 'i');
    if (state) query.state = new RegExp(state, 'i');
    if (village) query.village = new RegExp(village, 'i');
    if (landType) query.landType = landType;
    if (isForSale === 'true') query['marketInfo.isForSale'] = true;
    if (assetId) query.assetId = new RegExp(assetId, 'i');
    if (verificationStatus) query.verificationStatus = verificationStatus;

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
      currentPage: parseInt(page),
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
    const land = await Land.findOne({ 
      assetId: new RegExp(`^${assetId}$`, 'i') 
    })
      .populate('currentOwner', 'fullName email walletAddress')
      .populate('addedBy', 'fullName')
      .populate('verifiedBy', 'fullName');

    if (!land) {
      return res.status(404).json({ message: 'Land not found with this Asset ID' });
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
      return res.status(403).json({ 
        message: 'User must be verified to claim land ownership. Please complete your verification first.' 
      });
    }

    const land = await Land.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.currentOwner) {
      return res.status(400).json({ message: 'Land already has an owner' });
    }

    // Update land ownership
    land.currentOwner = req.user._id;
    land.ownershipHistory.push({
      owner: req.user._id,
      fromDate: new Date(),
      documentReference: 'DIGITAL_CLAIM'
    });
    land.status = 'AVAILABLE';
    await land.save();

    // Add to user's owned lands
    user.ownedLands.push(land._id);
    await user.save();

    await land.populate('currentOwner', 'fullName email');

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
    console.log('Digitalizing land:', req.params.landId);
    
    const land = await Land.findById(req.params.landId)
      .populate('currentOwner', 'fullName email');

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (land.digitalDocument.isDigitalized) {
      return res.status(400).json({ message: 'Land is already digitalized' });
    }

    // Generate QR code
    const qrData = {
      assetId: land.assetId,
      owner: land.currentOwner?.fullName || 'Unassigned',
      verifyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-land/${land.assetId}`,
      digitalizedDate: new Date().toISOString()
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

    console.log('Land digitalized successfully:', land.assetId);

    res.json({
      message: 'Land digitalized successfully',
      digitalDocument: land.digitalDocument
    });
  } catch (error) {
    console.error('Digitalization error:', error);
    res.status(500).json({ 
      message: 'Failed to digitalize land document',
      error: error.message 
    });
  }
});

// List land for sale (Owner only)
router.post('/:landId/list-for-sale', auth, async (req, res) => {
  try {
    const { askingPrice, description } = req.body;
    const land = await Land.findById(req.params.landId);

    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }

    if (!land.currentOwner || land.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can list this land for sale' });
    }

    if (!land.digitalDocument.isDigitalized) {
      return res.status(400).json({ 
        message: 'Land must be digitalized before listing for sale. Please contact admin.' 
      });
    }

    // Calculate price per sqft if area is available
    let pricePerSqft = 0;
    if (land.area.sqft > 0) {
      pricePerSqft = parseFloat(askingPrice) / land.area.sqft;
    }

    land.marketInfo = {
      isForSale: true,
      askingPrice: parseFloat(askingPrice),
      pricePerSqft,
      listedDate: new Date(),
      description: description || '',
      images: []
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
      status: 'FOR_SALE',
      'digitalDocument.isDigitalized': true
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
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get lands for sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initiate land purchase (Buyer)
router.post('/:landId/purchase', auth, async (req, res) => {
  try {
    const { offerPrice } = req.body;
    const land = await Land.findById(req.params.landId).populate('currentOwner');

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
    if (buyer.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ 
        message: 'You must be verified to purchase land' 
      });
    }

    // Create transaction
    const transaction = new LandTransaction({
      landId: land._id,
      seller: land.currentOwner._id,
      buyer: req.user._id,
      agreedPrice: parseFloat(offerPrice),
      transactionType: 'SALE',
      status: 'INITIATED'
    });

    await transaction.save();

    // Update land status
    land.status = 'UNDER_TRANSACTION';
    await land.save();

    res.json({
      message: 'Purchase request initiated successfully',
      transactionId: transaction._id
    });
  } catch (error) {
    console.error('Purchase initiation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;