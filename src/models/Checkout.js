const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  products: [{
    productId: {
      type: mongoose.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    count: {
      type: Number,
      required: true,
      min: [1, 'تعداد باید حداقل 1 باشد']
    }
  }],
  submition: {
    type: String,
    required: [true, 'نحوه ارسال الزامی است'],
    minLength: [4, 'نحوه ارسال باید حداقل 4 کاراکتر باشد'],
    maxLength: [60, 'نحوه ارسال نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  authority: {
    type: String,
    required: [true, 'شناسه پرداخت الزامی است'],
    trim: true
  },
  totalPrice: {
    type: Number,
    required: [true, 'قیمت کل الزامی است'],
    min: [0, 'قیمت کل نمی‌تواند منفی باشد']
  },
  totalWeight: {
    type: Number,
    required: [true, 'وزن کل الزامی است'],
    min: [0, 'وزن کل نمی‌تواند منفی باشد']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'تخفیف نمی‌تواند منفی باشد']
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'شناسه کاربر الزامی است']
  },
  expiredAt: {
    type: Date,
    required: true,
    default: () => Date.now() + (60 * 60 * 1000) // 1 hour from now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add TTL index for automatic document expiration
checkoutSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

// Add other indexes
checkoutSchema.index({ userId: 1 });
checkoutSchema.index({ authority: 1 });

module.exports = mongoose.model('Checkout', checkoutSchema); 