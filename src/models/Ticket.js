const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'شناسه کاربر الزامی است']
  },
  response: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    default: 'در انتظار بررسی',
    enum: ['در انتظار بررسی', 'در حال بررسی', 'پاسخ داده‌شد', 'بسته شد' , 'در انتظار پاسخ شما'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'عنوان تیکت الزامی است'],
    maxLength: [100, 'عنوان تیکت نمی‌تواند بیشتر از 100 کاراکتر باشد'],
    trim: true
  },
  txt: {
    type: String,
    required: [true, 'متن تیکت الزامی است'],
    maxLength: [500, 'متن تیکت نمی‌تواند بیشتر از 500 کاراکتر باشد'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes
ticketSchema.index({ userId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ createdAt: -1 });


module.exports = mongoose.model('Ticket', ticketSchema); 