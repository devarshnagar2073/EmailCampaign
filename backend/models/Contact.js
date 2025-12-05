const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  // Store all CSV columns here as key-value pairs for variable replacement
  data: {
    type: Map,
    of: String,
    default: {}
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  errorMessage: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient batch fetching
ContactSchema.index({ campaignId: 1, status: 1 });

module.exports = mongoose.model('Contact', ContactSchema);