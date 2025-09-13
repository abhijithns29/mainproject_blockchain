const mongoose = require('mongoose');

const landTransactionSchema = new mongoose.Schema({
  // Transaction identification
  transactionId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  
  // Land and parties involved
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DigitizedLand',
    required: true
  },
  
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction details
  transactionType: {
    type: String,
    enum: ['SALE', 'TRANSFER', 'INHERITANCE', 'GIFT'],
    default: 'SALE'
  },
  
  agreedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment details
  paymentDetails: {
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER'],
      default: 'BANK_TRANSFER'
    },
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentSchedule: [{
      amount: Number,
      dueDate: Date,
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE'],
        default: 'PENDING'
      },
      paidDate: Date,
      reference: String
    }]
  },
  
  // Transaction status
  status: {
    type: String,
    enum: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
    default: 'INITIATED'
  },
  
  // Documents submitted by parties
  documents: [{
    documentType: {
      type: String,
      enum: ['SALE_AGREEMENT', 'IDENTITY_PROOF', 'ADDRESS_PROOF', 'INCOME_PROOF', 'NOC', 'OTHER'],
      required: true
    },
    documentName: String,
    documentUrl: String,
    ipfsHash: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Admin review process
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING'
    },
    comments: String,
    rejectionReason: String,
    approvalConditions: [String],
    documentsVerified: {
      type: Boolean,
      default: false
    },
    legalClearance: {
      type: Boolean,
      default: false
    },
    financialVerification: {
      type: Boolean,
      default: false
    }
  },
  
  // Transaction completion details
  completionDetails: {
    completedDate: Date,
    registrationNumber: String,
    registrationDate: Date,
    registrationOffice: String,
    stampDuty: {
      type: Number,
      default: 0
    },
    registrationFee: {
      type: Number,
      default: 0
    },
    totalCharges: {
      type: Number,
      default: 0
    },
    
    // Generated documents
    transactionCertificate: {
      certificateUrl: String,
      qrCode: String,
      ipfsHash: String
    },
    
    // New ownership document for buyer
    newOwnershipDocument: {
      certificateUrl: String,
      qrCode: String,
      ipfsHash: String
    }
  },
  
  // Blockchain information
  blockchainInfo: {
    txHash: String,
    blockNumber: Number,
    gasUsed: Number,
    confirmed: {
      type: Boolean,
      default: false
    }
  },
  
  // Chat reference (if transaction originated from chat)
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  
  // Timeline tracking
  timeline: [{
    event: {
      type: String,
      enum: ['INITIATED', 'DOCUMENTS_UPLOADED', 'REVIEW_STARTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Additional metadata
  metadata: {
    initiatedFrom: {
      type: String,
      enum: ['MARKETPLACE', 'CHAT', 'DIRECT', 'ADMIN'],
      default: 'MARKETPLACE'
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL'
    },
    estimatedCompletionDate: Date,
    actualCompletionDate: Date,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes for better performance
landTransactionSchema.index({ transactionId: 1 });
landTransactionSchema.index({ landId: 1 });
landTransactionSchema.index({ seller: 1 });
landTransactionSchema.index({ buyer: 1 });
landTransactionSchema.index({ status: 1 });
landTransactionSchema.index({ 'adminReview.reviewedBy': 1 });
landTransactionSchema.index({ createdAt: -1 });

// Pre-save middleware
landTransactionSchema.pre('save', function(next) {
  // Generate transaction ID if not provided
  if (!this.transactionId && this.isNew) {
    const timestamp = Date.now().toString().slice(-8);
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `TXN${timestamp}${randomNum}`;
  }
  
  // Calculate remaining amount
  if (this.isModified('agreedPrice') || this.isModified('paymentDetails.advanceAmount')) {
    this.paymentDetails.remainingAmount = this.agreedPrice - (this.paymentDetails.advanceAmount || 0);
  }
  
  // Add timeline entry for status changes
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      event: this.status,
      timestamp: new Date(),
      description: `Transaction status changed to ${this.status}`
    });
  }
  
  // Set completion date when status changes to COMPLETED
  if (this.isModified('status') && this.status === 'COMPLETED') {
    this.completionDetails.completedDate = new Date();
    this.metadata.actualCompletionDate = new Date();
  }
  
  next();
});

// Instance methods
landTransactionSchema.methods.addTimelineEvent = function(event, performedBy, description, metadata = {}) {
  this.timeline.push({
    event,
    timestamp: new Date(),
    performedBy,
    description,
    metadata
  });
};

landTransactionSchema.methods.canBeApproved = function() {
  return this.status === 'UNDER_REVIEW' && 
         this.adminReview.documentsVerified && 
         this.adminReview.legalClearance;
};

landTransactionSchema.methods.canBeRejected = function() {
  return ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'].includes(this.status);
};

landTransactionSchema.methods.calculateTotalCharges = function() {
  const stampDuty = this.completionDetails.stampDuty || 0;
  const registrationFee = this.completionDetails.registrationFee || 0;
  return stampDuty + registrationFee;
};

landTransactionSchema.methods.getTransactionDuration = function() {
  const startDate = this.createdAt;
  const endDate = this.completionDetails.completedDate || new Date();
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // Days
};

landTransactionSchema.methods.isOverdue = function() {
  if (!this.metadata.estimatedCompletionDate || this.status === 'COMPLETED') {
    return false;
  }
  return new Date() > this.metadata.estimatedCompletionDate;
};

// Static methods
landTransactionSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId: transactionId.toUpperCase() });
};

landTransactionSchema.statics.findPendingReview = function() {
  return this.find({
    status: { $in: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
  }).populate('landId seller buyer');
};

landTransactionSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [{ seller: userId }, { buyer: userId }]
  }).populate('landId seller buyer');
};

landTransactionSchema.statics.findByLand = function(landId) {
  return this.find({ landId }).populate('seller buyer');
};

landTransactionSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$agreedPrice' }
      }
    }
  ]);
};

landTransactionSchema.statics.getMonthlyStats = function(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lt: endDate }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 },
        totalValue: { $sum: '$agreedPrice' },
        avgValue: { $avg: '$agreedPrice' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

// Transform output
landTransactionSchema.methods.toJSON = function() {
  const transaction = this.toObject();
  
  // Add computed fields
  transaction.totalCharges = this.calculateTotalCharges();
  transaction.transactionDuration = this.getTransactionDuration();
  transaction.isOverdue = this.isOverdue();
  transaction.canBeApproved = this.canBeApproved();
  transaction.canBeRejected = this.canBeRejected();
  
  return transaction;
};

module.exports = mongoose.model('LandTransaction', landTransactionSchema);