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
    required: true,
    unique: true
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
    default: 'PENDING'
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
  ownedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);