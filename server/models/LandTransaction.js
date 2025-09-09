const mongoose = require('mongoose');

const landTransactionSchema = new mongoose.Schema({
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land',
    required: true
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
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
  agreedPrice: {
    type: Number,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['SALE', 'TRANSFER', 'INHERITANCE'],
    default: 'SALE'
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'MIXED']
    },
    installments: [{
      amount: Number,
      dueDate: Date,
      paidDate: Date,
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE'],
        default: 'PENDING'
      }
    }]
  },
  documents: [{
    type: String,
    url: String,
    ipfsHash: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['INITIATED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'],
    default: 'INITIATED'
  },
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    comments: String,
    rejectionReason: String
  },
  completionDetails: {
    completedDate: Date,
    newOwnershipDocument: {
      certificateUrl: String,
      qrCode: String,
      ipfsHash: String
    },
    registrationDetails: {
      registrationNumber: String,
      registrationDate: Date,
      registrationOffice: String,
      stampDuty: Number,
      registrationFee: Number
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LandTransaction', landTransactionSchema);