const mongoose = require('mongoose');

const landSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true
  },
  surveyNumber: {
    type: String,
    required: true
  },
  subDivision: String,
  village: {
    type: String,
    required: true
  },
  taluka: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  area: {
    acres: Number,
    guntas: Number,
    sqft: Number
  },
  boundaries: {
    north: String,
    south: String,
    east: String,
    west: String
  },
  landType: {
    type: String,
    enum: ['AGRICULTURAL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT'],
    required: true
  },
  classification: {
    type: String,
    enum: ['DRY', 'WET', 'GARDEN', 'INAM', 'SARKAR']
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ownershipHistory: [{
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ownerName: String, // For cases where owner is not in system
    fromDate: Date,
    toDate: Date,
    documentReference: String
  }],
  originalDocuments: [{
    type: {
      type: String,
      enum: ['SALE_DEED', 'PATTA', 'KHATA', 'SURVEY_SETTLEMENT', 'MUTATION', 'OTHER']
    },
    documentNumber: String,
    date: Date,
    registrationOffice: String,
    documentUrl: String,
    ipfsHash: String
  }],
  digitalDocument: {
    qrCode: String,
    certificateUrl: String,
    ipfsHash: String,
    generatedDate: Date,
    isDigitalized: { type: Boolean, default: false }
  },
  marketInfo: {
    isForSale: { type: Boolean, default: false },
    askingPrice: Number,
    pricePerSqft: Number,
    listedDate: Date,
    description: String,
    images: [String]
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'FOR_SALE', 'UNDER_TRANSACTION', 'SOLD', 'DISPUTED'],
    default: 'AVAILABLE'
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate unique asset ID
landSchema.pre('save', function(next) {
  if (!this.assetId) {
    const stateCode = this.state.substring(0, 2).toUpperCase();
    const districtCode = this.district.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.assetId = `${stateCode}${districtCode}${timestamp}${randomNum}`;
  }
  next();
});

// Add index for faster searches
landSchema.index({ assetId: 1 });
landSchema.index({ village: 1, district: 1, state: 1 });
landSchema.index({ 'marketInfo.isForSale': 1 });
landSchema.index({ currentOwner: 1 });
landSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('Land', landSchema);