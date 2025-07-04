const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  products: [{
    productId: {
      type: mongoose.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'قیمت نمی‌تواند منفی باشد']
    },
    discount: {
      type: Number,
      required: true,
      min: [0, 'تخفیف نمی‌تواند منفی باشد'],
      max: [100, 'تخفیف نمی‌تواند بیشتر از 100 درصد باشد']
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
    enum: ["پست", "پیک"]
  },
  totalPrice: {
    type: Number,
    required: [true, 'قیمت کل الزامی است'],
    min: [0, 'قیمت کل نمی‌تواند منفی باشد']
  },
  totalWeight: {
    type: Number,
    default: 0,
    min: [0, 'وزن کل نمی‌تواند منفی باشد']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'هزینه ارسال نمی‌تواند منفی باشد']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'تخفیف نمی‌تواند منفی باشد']
  },
  status: {
    type: String,
    default: 'پرداخت نشده',
    enum: ['پرداخت نشده', 'در انتظار تایید', 'در حال آماده‌سازی', 'ارسال شد', 'تحویل داده‌شد', 'لغو شد']
  },
  paymentId: {
    type: String,
    default: '',
    trim: true
  },
  authority: {
    type: String,
    required: [true, 'شناسه پرداخت الزامی است'],
    trim: true
  },
  postVerify: {
    type: String,
    default: '',
    trim: true
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'شناسه کاربر الزامی است']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Add virtual for totalWeight calculation
orderSchema.virtual('calculatedTotalWeight').get(async function () {
  if (!this.populated('products.productId')) {
    await this.populate('products.productId');
  }

  return this.products.reduce((total, item) => {
    return total + (item.productId.weight * item.count);
  }, 0);
});

// Add virtual for shipping cost calculation
orderSchema.virtual('calculatedShippingCost').get(function () {
  return (this.totalWeight * 7) + 90000;
});

// Pre-save middleware to update totalWeight and shippingCost
orderSchema.pre('save', async function (next) {
  if (this.isModified('products')) {
    this.totalWeight = await this.calculatedTotalWeight;
    this.shippingCost = this.calculatedShippingCost;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema); 