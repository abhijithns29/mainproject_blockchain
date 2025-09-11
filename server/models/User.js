const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  // User verification documents
  verificationDocuments: {
    panCard: {
      number: String,
      documentUrl: String,
      verified: { type: Boolean, default: false }
    },
    aadhaarCard: {
      number: String,
      documentUrl: String,
      verified: { type: Boolean, default: false }
    },
    drivingLicense: {
      number: String,
      documentUrl: String,
      verified: { type: Boolean, default: false }
    },
    passport: {
      number: String,
      documentUrl: String,
      verified: { type: Boolean, default: false }
    }
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: function() {
      return this.role === 'ADMIN' ? 'VERIFIED' : 'PENDING';
    }
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date,
  rejectionReason: String,
  profile: {
    phoneNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    profileImage: String
  },
  ownedLands: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land'
  }]
}, {
  timestamps: true
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Set admin defaults if role is ADMIN
  if (this.role === 'ADMIN') {
    this.verificationStatus = 'VERIFIED';
    if (!this.verificationDate) {
      this.verificationDate = new Date();
    }
  }
  
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);