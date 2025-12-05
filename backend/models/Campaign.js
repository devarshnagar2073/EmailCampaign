
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'ABORTED'],
    default: 'DRAFT',
  },
  // CSV File Details
  csvPath: {
    type: String,
    required: true,
  },
  csvOriginalName: {
    type: String,
    required: true,
  },
  totalContacts: {
    type: Number,
    default: 0,
  },
  // Mappings
  emailColumn: {
    type: String,
  },
  csvHeaders: {
    type: [String],
    default: [],
  },
  fieldMapping: {
      type: Map,
      of: String,
      default: {}
  },
  // Scheduling & Config
  scheduledAt: {
    type: Date,
  },
  launchConfig: {
    subject: String,
    body: String,
    trackOpens: Boolean,
    trackClicks: Boolean,
    attachments: [
        {
            filename: String,
            path: String
        }
    ]
  },
  // Database Import Flag
  ingested: {
    type: Boolean,
    default: false
  },
  // Stats (Cached for list view)
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Campaign', CampaignSchema);
