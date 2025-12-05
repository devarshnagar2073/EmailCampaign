
const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    required: true,
  },
  errorMessage: {
    type: String,
  },
  campaignName: {
    type: String,
  },
  isReviewed: {
    type: Boolean,
    default: false,
  },
  // Tracking
  opened: {
    type: Boolean,
    default: false,
  },
  clicked: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('EmailLog', EmailLogSchema);
