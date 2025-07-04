const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  txt: {
    type: String,
    required: [true, 'متن نظر الزامی است'],
    maxLength: [1000, 'متن نظر نمی‌تواند بیشتر از 1000 کاراکتر باشد'],
    trim: true
  },
  status: {
    type: String,
    maxLength: [20, 'وضعیت نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    enum: ['در انتظار تایید', 'منتظر پاسخ شما', 'بسته شد'],
    default: 'در انتظار تایید'
  },
  star: {
    type: Number,
    required: [true, 'امتیاز الزامی است'],
    min: [1, 'امتیاز باید بین 1 تا 5 باشد'],
    max: [5, 'امتیاز باید بین 1 تا 5 باشد']
  },
  like: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'تعداد لایک نمی‌تواند منفی باشد']
  },
  productId: {
    type: mongoose.Types.ObjectId,
    ref: 'Product'
  },
  articleId: {
    type: mongoose.Types.ObjectId,
    ref: 'Article'
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'شناسه کاربر الزامی است']
  },
  replies: [{
    txt: {
      type: String,
      required: true,
      maxLength: [500, 'متن پاسخ نمی‌تواند بیشتر از 500 کاراکتر باشد'],
      trim: true
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    like: {
      type: Number,
      default: 0,
      min: [0, 'تعداد لایک نمی‌تواند منفی باشد']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes
commentSchema.index({ productId: 1 });
commentSchema.index({ articleId: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ status: 1 });

module.exports = mongoose.model('Comment', commentSchema); 