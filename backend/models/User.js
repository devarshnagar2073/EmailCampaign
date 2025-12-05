
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER'],
    default: 'USER',
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED'],
    default: 'PENDING', 
  },
  smtpConfig: {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    user: { type: String, default: '' },
    pass: { type: String, default: '' },
    fromEmail: { type: String, default: '' },
  },
  // Quota Management
  dailyQuota: {
    type: Number,
    default: 100, // Default limit per day
  },
  emailsSentToday: {
    type: Number,
    default: 0,
  },
  lastSentDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('User', UserSchema);
