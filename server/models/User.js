const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  
  // Verification system
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: function() {
      return this.role === 'ADMIN' ? 'VERIFIED' : 'PENDING';
    }
  },
  
  // Verification documents
  verificationDocuments: {
    aadhaarCard: {
      number: {
        type: String,
        trim: true
      },
      documentUrl: String,
      ipfsHash: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    panCard: {
      number: {
        type: String,
        trim: true
      },
      documentUrl: String,
      ipfsHash: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    drivingLicense: {
      number: {
        type: String,
        trim: true
      },
      documentUrl: String,
      ipfsHash: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    passport: {
      number: {
        type: String,
        trim: true
      },
      documentUrl: String,
      ipfsHash: String,
      verified: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Verification metadata
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date,
  rejectionReason: String,
  
  // User profile
  profile: {
    phoneNumber: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    profileImage: String
  },
  
  // Land ownership references
  ownedLands: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DigitizedLand'
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Login tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ verificationStatus: 1 });
userSchema.index({ role: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Set admin defaults
  if (this.role === 'ADMIN') {
    this.verificationStatus = 'VERIFIED';
    if (!this.verificationDate) {
      this.verificationDate = new Date();
    }
  }
  
  // Normalize email
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Check if user has required verification documents
userSchema.methods.hasRequiredDocuments = function() {
  if (this.role === 'ADMIN') return true;
  
  const docs = this.verificationDocuments;
  return (docs.aadhaarCard && docs.aadhaarCard.number) || 
         (docs.panCard && docs.panCard.number);
};

// Check if user can claim land ownership
userSchema.methods.canClaimLand = function() {
  return this.role === 'ADMIN' || this.verificationStatus === 'VERIFIED';
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.findVerifiedUsers = function() {
  return this.find({ verificationStatus: 'VERIFIED', role: 'USER' });
};

userSchema.statics.findPendingVerifications = function() {
  return this.find({ verificationStatus: 'PENDING', role: 'USER' });
};

// Transform output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', userSchema);