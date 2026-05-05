const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان الزامی است'],
    trim: true
  },
  body: {
    type: String,
    required: [true, 'متن پیام الزامی است'],
    trim: true
  },
  target: {
    type: String,
    enum: ['all', 'user', 'status'],
    required: [true, 'نوع هدف الزامی است']
  },
  targetUsers: [{
    type: mongoose.Types.ObjectId,
    ref: 'User'
  }],
  targetStatus: {
    type: String,
    enum: ['user', 'admin', 'owner', 'banUser', 'notifUser']
  },
  status: {
    type: String,
    enum: ['active', 'sent', 'inactive'],
    default: 'active'
  },
  readBy: [{
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  source: {
    type: String,
    enum: ['order', 'discount', 'promo', 'system', 'manual'],
    default: 'manual'
  },
  sourceId: {
    type: String
  }
}, {
  timestamps: true
});

alertSchema.index({ target: 1, targetUsers: 1 });
alertSchema.index({ target: 1, targetStatus: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ 'readBy.userId': 1 });

module.exports = mongoose.model('Alert', alertSchema);