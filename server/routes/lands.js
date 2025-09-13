const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const Land = require('../models/Land');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { auth, adminAuth } = require('../middleware/auth');
const ipfsService = require('../config/ipfs');
const PDFGenerator = require('../utils/pdfGenerator');
const DocumentWatermark = require('../utils/documentWatermark');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

// Add land to database (Admin only)
router.post('/add', adminAuth, upload.array('documents', 10), async (req, res) => {
  try {
    console.log('=== ADDING LAND TO DATABASE ===');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files?.length || 0);

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
      coordinates,
      soilType,
      waterSource,
      roadAccess,
      electricityConnection
    } = req.body;

    // Validate required fields
    const requiredFields = { surveyNumber, village, taluka, district, state, pincode, landType };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Parse JSON strings safely
    let parsedArea = {};
    let parsedBoundaries = {};
    let parsedCoordinates = null;

    try {
      parsedArea = area ? (typeof area === 'string' ? JSON.parse(area) : area) : {};
      parsedBoundaries = boundaries ? (typeof boundaries === 'string' ? JSON.parse(boundaries) : boundaries) : {};
      parsedCoordinates = coordinates ? (typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates) : null;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ 
        message: 'Invalid JSON format in area, boundaries, or coordinates fields' 
      });
    }

    // Upload documents to IPFS with watermarks
    const originalDocuments = [];
    if (req.files && req.files.length > 0) {
      console.log('Processing and uploading documents...');
      
      for (const file of req.files) {
        try {
          // Generate watermark
          const watermarkText = DocumentWatermark.generateWatermarkText(
            'PENDING', // Asset ID will be generated
            ownerName || 'Unknown'
          );
          
          let processedBuffer;
          if (file.mimetype === 'application/pdf') {
            processedBuffer = await DocumentWatermark.addWatermarkToPDF(file.buffer, watermarkText);
          } else {
            processedBuffer = await DocumentWatermark.addWatermarkToImage(file.buffer, watermarkText);
          }
          
          const ipfsHash = await ipfsService.uploadFile(processedBuffer, file.originalname);
          
          originalDocuments.push({
            type: 'OTHER',
            documentNumber: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(),
            registrationOffice: `${district} Sub-Registrar Office`,
            documentUrl: ipfsService.getFileUrl(ipfsHash),
            ipfsHash,
            watermark: watermarkText,
            uploadedBy: req.user._id
          });
          
          console.log(`Document processed and uploaded: ${file.originalname}`);
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          return res.status(500).json({ 
            message: `Failed to upload document: ${file.originalname}` 
          });
        }
      }
    }

    // Create land record
    const landData = {
      surveyNumber: surveyNumber.trim(),
      subDivision: subDivision?.trim() || '',
      village: village.trim(),
      taluka: taluka.trim(),
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
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
      coordinates: parsedCoordinates ? {
        latitude: parseFloat(parsedCoordinates.latitude),
        longitude: parseFloat(parsedCoordinates.longitude)
      } : undefined,
      landType,
      classification: classification || undefined,
      originalDocuments,
      ownershipHistory: ownerName ? [{
        ownerName: ownerName.trim(),
        fromDate: new Date(),
        documentReference: 'INITIAL_RECORD',
        transactionType: 'INITIAL'
      }] : [],
      addedBy: req.user._id,
      verificationStatus: 'PENDING',
      metadata: {
        soilType: soilType || '',
        waterSource: waterSource || '',
        roadAccess: roadAccess === 'true' || roadAccess === true,
        electricityConnection: electricityConnection === 'true' || electricityConnection === true
      }
    };

    console.log('Creating land with processed data...');
    const land = new Land(landData);
    await land.save();

    // Log audit trail
    await AuditLog.logAction(
      'LAND_ADD',
      req.user._id,
      'LAND',
      land._id.toString(),
      {
        assetId: land.assetId,
        village: land.village,
        district: land.district,
        documentsUploaded: originalDocuments.length
      },
      req
    );

    console.log(`✅ Land successfully added with Asset ID: ${land.assetId}`);

    res.status(201).json({
      success: true,
      message: 'Land added to database successfully',
      land: {
        id: land._id,
        assetId: land.assetId,
        surveyNumber: land.surveyNumber,
        village: land.village,
        district: land.district,
        state: land.state,
        landType: land.landType,
        documentsUploaded: originalDocuments.length
      }
    });
  } catch (error) {
    console.error('❌ Add land error:', error);
    
    // Log failed attempt
    try {
      await AuditLog.logAction(
        'LAND_ADD',
        req.user._id,
        'LAND',
        'FAILED',
        { error: error.message },
        req
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to add land to database',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Digitalize land document (Admin only)
router.post('/:landId/digitalize', adminAuth, async (req, res) => {
  try {
    console.log('=== DIGITALIZING LAND DOCUMENT ===');
    console.log('Land ID:', req.params.landId);
    
    const land = await Land.findById(req.params.landId)
      .populate('currentOwner', 'fullName email');

    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found' 
      });
    }

    if (land.digitalDocument.isDigitalized) {
      return res.status(400).json({ 
        success: false,
        message: 'Land is already digitalized' 
      });
    }

    // Generate QR code with verification data
    const qrData = {
      assetId: land.assetId,
      owner: land.currentOwner?.fullName || 'Unassigned',
      verifyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-land/${land.assetId}`,
      digitalizedDate: new Date().toISOString(),
      digitalizedBy: req.user.fullName
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Generate watermark
    const watermarkText = DocumentWatermark.generateWatermarkText(
      land.assetId,
      land.currentOwner?.fullName || 'Government Land'
    );

    // Generate digital ownership certificate
    const certificatePDF = await PDFGenerator.generateLandCertificate(land, qrCodeDataURL);
    const watermarkedPDF = await DocumentWatermark.addWatermarkToPDF(certificatePDF, watermarkText);
    
    const certificateHash = await ipfsService.uploadFile(
      watermarkedPDF,
      `land-certificate-${land.assetId}.pdf`
    );

    // Update land with digital document info
    land.digitalDocument = {
      qrCode: qrCodeDataURL,
      certificateUrl: ipfsService.getFileUrl(certificateHash),
      ipfsHash: certificateHash,
      generatedDate: new Date(),
      isDigitalized: true,
      watermark: watermarkText,
      digitalizedBy: req.user._id
    };
    
    land.verificationStatus = 'VERIFIED';
    land.verifiedBy = req.user._id;

    await land.save();

    // Log audit trail
    await AuditLog.logAction(
      'LAND_DIGITALIZE',
      req.user._id,
      'LAND',
      land._id.toString(),
      {
        assetId: land.assetId,
        certificateGenerated: true,
        qrCodeGenerated: true
      },
      req
    );

    console.log(`✅ Land digitalized successfully: ${land.assetId}`);

    res.json({
      success: true,
      message: 'Land digitalized successfully',
      digitalDocument: {
        certificateUrl: land.digitalDocument.certificateUrl,
        qrCode: land.digitalDocument.qrCode,
        isDigitalized: true,
        generatedDate: land.digitalDocument.generatedDate
      }
    });
  } catch (error) {
    console.error('❌ Digitalization error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to digitalize land document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all lands with advanced filtering
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
      verificationStatus,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (district) query.district = new RegExp(district, 'i');
    if (state) query.state = new RegExp(state, 'i');
    if (village) query.village = new RegExp(village, 'i');
    if (landType) query.landType = landType;
    if (isForSale === 'true') query['marketInfo.isForSale'] = true;
    if (assetId) query.assetId = new RegExp(assetId, 'i');
    if (verificationStatus) query.verificationStatus = verificationStatus;
    
    // Price filters
    if (minPrice || maxPrice) {
      query['marketInfo.askingPrice'] = {};
      if (minPrice) query['marketInfo.askingPrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['marketInfo.askingPrice'].$lte = parseFloat(maxPrice);
    }
    
    // Area filters (convert to sqft for comparison)
    if (minArea || maxArea) {
      // This would require a more complex aggregation pipeline
      // For now, we'll filter by acres
      if (minArea) query['area.acres'] = { $gte: parseFloat(minArea) };
      if (maxArea) {
        query['area.acres'] = { ...query['area.acres'], $lte: parseFloat(maxArea) };
      }
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const lands = await Land.find(query)
      .populate('currentOwner', 'fullName email')
      .populate('addedBy', 'fullName')
      .populate('verifiedBy', 'fullName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortObj);

    const total = await Land.countDocuments(query);

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        district,
        state,
        landType,
        isForSale,
        verificationStatus
      }
    });
  } catch (error) {
    console.error('Get lands error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch lands' 
    });
  }
});

// Search land by asset ID
router.get('/search/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    if (!assetId || assetId.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Asset ID is required' 
      });
    }

    const land = await Land.findByAssetId(assetId.trim())
      .populate('currentOwner', 'fullName email walletAddress')
      .populate('addedBy', 'fullName')
      .populate('verifiedBy', 'fullName')
      .populate('ownershipHistory.owner', 'fullName');

    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found with this Asset ID' 
      });
    }

    res.json({ 
      success: true,
      land 
    });
  } catch (error) {
    console.error('Search land error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Search failed' 
    });
  }
});

// Claim ownership (Verified users only)
router.post('/:landId/claim', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.canClaimLand()) {
      return res.status(403).json({ 
        success: false,
        message: 'User must be verified to claim land ownership. Please complete your verification first.' 
      });
    }

    const land = await Land.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found' 
      });
    }

    if (land.currentOwner) {
      return res.status(400).json({ 
        success: false,
        message: 'Land already has an owner' 
      });
    }

    if (land.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ 
        success: false,
        message: 'Land must be verified before claiming ownership' 
      });
    }

    // Update land ownership
    land.addOwnershipRecord(req.user._id, 'INITIAL', 'DIGITAL_CLAIM');
    await land.save();

    // Add to user's owned lands
    user.ownedLands.push(land._id);
    await user.save();

    // Log audit trail
    await AuditLog.logAction(
      'LAND_CLAIM',
      req.user._id,
      'LAND',
      land._id.toString(),
      {
        assetId: land.assetId,
        claimedBy: user.fullName
      },
      req
    );

    await land.populate('currentOwner', 'fullName email');

    console.log(`✅ Land ${land.assetId} claimed by user ${user.email}`);

    res.json({
      success: true,
      message: 'Land ownership claimed successfully',
      land
    });
  } catch (error) {
    console.error('Claim ownership error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to claim ownership' 
    });
  }
});

// List land for sale (Owner only)
router.post('/:landId/list-for-sale', auth, async (req, res) => {
  try {
    const { askingPrice, description, features, nearbyAmenities } = req.body;
    
    if (!askingPrice || askingPrice <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid asking price is required' 
      });
    }

    const land = await Land.findById(req.params.landId);
    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found' 
      });
    }

    if (!land.currentOwner || land.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the owner can list this land for sale' 
      });
    }

    if (!land.canBeListedForSale()) {
      return res.status(400).json({ 
        success: false,
        message: 'Land must be digitalized and verified before listing for sale' 
      });
    }

    // Calculate price per sqft
    const totalAreaSqft = land.getTotalAreaSqft();
    let pricePerSqft = 0;
    if (totalAreaSqft > 0) {
      pricePerSqft = parseFloat(askingPrice) / totalAreaSqft;
    }

    land.marketInfo = {
      isForSale: true,
      askingPrice: parseFloat(askingPrice),
      pricePerSqft,
      listedDate: new Date(),
      description: description || '',
      features: features || [],
      nearbyAmenities: nearbyAmenities || []
    };

    await land.save();

    // Log audit trail
    await AuditLog.logAction(
      'LAND_LIST_SALE',
      req.user._id,
      'LAND',
      land._id.toString(),
      {
        assetId: land.assetId,
        askingPrice: parseFloat(askingPrice)
      },
      req
    );

    console.log(`✅ Land ${land.assetId} listed for sale`);

    res.json({
      success: true,
      message: 'Land listed for sale successfully',
      land
    });
  } catch (error) {
    console.error('List for sale error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to list land for sale' 
    });
  }
});

// Get user's owned lands
router.get('/my-lands', auth, async (req, res) => {
  try {
    const lands = await Land.findByOwner(req.user._id)
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      lands 
    });
  } catch (error) {
    console.error('Get user lands error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch your lands' 
    });
  }
});

// Get lands for sale with advanced filters
router.get('/for-sale', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      minPrice, 
      maxPrice, 
      district, 
      state, 
      landType,
      minArea,
      maxArea,
      sortBy = 'listedDate',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (district) filters.district = district;
    if (state) filters.state = state;
    if (landType) filters.landType = landType;

    let query = Land.findForSale(filters)
      .populate('currentOwner', 'fullName email')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply sorting
    const sortObj = {};
    if (sortBy === 'price') {
      sortObj['marketInfo.askingPrice'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'area') {
      sortObj['area.acres'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortObj['marketInfo.listedDate'] = sortOrder === 'desc' ? -1 : 1;
    }
    
    query = query.sort(sortObj);
    const lands = await query;

    const total = await Land.countDocuments({
      'marketInfo.isForSale': true,
      status: 'FOR_SALE',
      'digitalDocument.isDigitalized': true,
      ...filters
    });

    res.json({
      success: true,
      lands,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get lands for sale error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch lands for sale' 
    });
  }
});

// Get nearby lands (geo-location based)
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude and longitude are required' 
      });
    }

    const lands = await Land.findNearby(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(maxDistance)
    ).populate('currentOwner', 'fullName email');

    res.json({
      success: true,
      lands,
      searchCenter: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      maxDistance: parseInt(maxDistance)
    });
  } catch (error) {
    console.error('Get nearby lands error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch nearby lands' 
    });
  }
});

// Verify land by QR code
router.get('/verify/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    const land = await Land.findByAssetId(assetId)
      .populate('currentOwner', 'fullName email')
      .populate('verifiedBy', 'fullName')
      .populate('ownershipHistory.owner', 'fullName');

    if (!land) {
      return res.status(404).json({ 
        success: false,
        message: 'Land not found' 
      });
    }

    if (!land.digitalDocument.isDigitalized) {
      return res.status(400).json({ 
        success: false,
        message: 'Land is not digitalized' 
      });
    }

    res.json({
      success: true,
      verification: {
        isValid: true,
        assetId: land.assetId,
        currentOwner: land.currentOwner,
        verificationStatus: land.verificationStatus,
        digitalizedDate: land.digitalDocument.generatedDate,
        ownershipHistory: land.ownershipHistory,
        landDetails: {
          village: land.village,
          district: land.district,
          state: land.state,
          area: land.area,
          landType: land.landType
        }
      }
    });
  } catch (error) {
    console.error('Verify land error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Verification failed' 
    });
  }
});

module.exports = router;