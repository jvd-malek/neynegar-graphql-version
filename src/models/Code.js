const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'کد الزامی است'],
    trim: true
  },
  exTime: {
    type: Number,
    required: [true, 'زمان انقضا الزامی است'],
    min: [0, 'زمان انقضا نمی‌تواند منفی باشد']
  },
  phone: {
    type: String,
    required: [true, 'شماره تلفن الزامی است'],
    trim: true,
    match: [/^09[0-9]{9}$/, 'شماره تلفن باید با 09 شروع شود و 11 رقمی باشد']
  },
  count: {
    type: Number,
    required: [true, 'تعداد دفعات استفاده الزامی است'],
    min: [0, 'تعداد دفعات استفاده نمی‌تواند منفی باشد']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes
codeSchema.index({ phone: 1 });
codeSchema.index({ code: 1 });
codeSchema.index({ exTime: 1 });

module.exports = mongoose.model('Code', codeSchema); 