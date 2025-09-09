const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['TEXT', 'OFFER', 'COUNTER_OFFER', 'ACCEPTANCE', 'REJECTION'],
      default: 'TEXT'
    },
    offerAmount: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  currentOffer: {
    amount: Number,
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_OFFERED'],
      default: 'PENDING'
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DEAL_AGREED', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  agreedPrice: Number,
  agreedDate: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);