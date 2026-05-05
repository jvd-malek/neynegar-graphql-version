const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  status: {
    type: String,
    required: [true, 'وضعیت کاربر الزامی است'],
    minLength: [4, 'وضعیت کاربر باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'وضعیت کاربر نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    enum: ['user', 'admin', 'owner', 'banUser', 'notifUser']
  },
  name: {
    type: String,
    required: [true, 'نام الزامی است'],
    minLength: [4, 'نام باید حداقل 4 کاراکتر باشد'],
    maxLength: [60, 'نام نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'شماره تلفن الزامی است'],
    maxLength: [11, 'شماره تلفن نمی‌تواند بیشتر از 11 کاراکتر باشد'],
    trim: true,
    unique: true
  },
  discount: [{
    code: String,
    date: Number,
    discount: Number,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],
  bascket: {
    type: [{
      target: {
        type: String,
        enum: ["Product", "Package"],
        default: 'Product'
      },
      packageId: {
        type: mongoose.Types.ObjectId,
        ref: 'Package'
      },
      productId: {
        type: mongoose.Types.ObjectId,
        ref: 'Product'
      },
      count: {
        type: Number,
        required: true,
        min: [1, 'تعداد محصول باید حداقل 1 باشد']
      }
    }],
    default: []
  },
  favorite: [{
    productId: {
      type: mongoose.Types.ObjectId,
      ref: 'Product'
    }
  }],
  readingList: [{
    articleId: {
      type: mongoose.Types.ObjectId,
      ref: 'Article'
    }
  }],
  address: {
    type: String,
    minLength: [2, 'آدرس باید حداقل 2 کاراکتر باشد'],
    maxLength: [1000, 'آدرس نمی‌تواند بیشتر از 1000 کاراکتر باشد'],
    trim: true
  },
  postCode: {
    type: Number
  },
  subscription: {
    endpoint: String,
    expirationTime: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  totalBuy: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'مبلغ کل خرید نمی‌تواند منفی باشد']
  },
  lastPromoSentAt: {
    type: Number,
    default: null
  },
  courseProgress: [{
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    progress: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Normalize phone number before saving
userSchema.pre('save', function (next) {
  if (this.isModified('phone')) {
    // Remove any non-digit characters
    let phone = this.phone.replace(/\D/g, '');

    // Handle different formats
    if (phone.startsWith('98')) {
      phone = phone.substring(2);
    } else if (phone.startsWith('+98')) {
      phone = phone.substring(3);
    }

    // Ensure it starts with 09
    if (!phone.startsWith('09')) {
      phone = '09' + phone;
    }

    // Check if the final length is correct
    if (phone.length !== 11) {
      return next(new Error('شماره تلفن نامعتبر است'));
    }

    this.phone = phone;
  }
  next();
});

// Normalize phone number before updating
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.phone) {
    // Remove any non-digit characters
    let phone = update.phone.replace(/\D/g, '');

    // Handle different formats
    if (phone.startsWith('98')) {
      phone = phone.substring(2);
    } else if (phone.startsWith('+98')) {
      phone = phone.substring(3);
    }

    // Ensure it starts with 09
    if (!phone.startsWith('09')) {
      phone = '09' + phone;
    }

    // Check if the final length is correct
    if (phone.length !== 11) {
      return next(new Error('شماره تلفن نامعتبر است'));
    }

    this.set({ phone });
  }
  next();
});

// Virtual for total price calculation
userSchema.virtual('totalPrice').get(function () {
  if (!this.bascket || !Array.isArray(this.bascket) || this.bascket.length === 0) {
    return 0;
  }
  return this.bascket.reduce((total, item) => {
    if (!item.productId || !item.productId.discount || !item.productId.price) {
      return total;
    }
    const latestDiscount = item.productId.discount[item.productId.discount.length - 1];
    const latestPrice = item.productId.price[item.productId.price.length - 1];

    if (latestDiscount && latestDiscount.discount > 0) {
      return total + (item.count * (latestPrice.price * ((100 - latestDiscount.discount) / 100)));
    } else {
      return total + (item.count * latestPrice.price);
    }
  }, 0);
});

// Virtual for total discount calculation
userSchema.virtual('totalDiscount').get(function () {
  if (!this.bascket || !Array.isArray(this.bascket) || this.bascket.length === 0) {
    return 0;
  }
  return this.bascket.reduce((total, item) => {
    if (!item.productId || !item.productId.discount || !item.productId.price) {
      return total;
    }
    const latestDiscount = item.productId.discount[item.productId.discount.length - 1];
    const latestPrice = item.productId.price[item.productId.price.length - 1];

    if (latestDiscount && latestDiscount.discount > 0) {
      return total + (item.count * (latestPrice.price * (latestDiscount.discount / 100)));
    } else {
      return total;
    }
  }, 0);
});

// Virtual for total weight calculation
userSchema.virtual('totalWeight').get(function () {
  if (!this.bascket || !Array.isArray(this.bascket) || this.bascket.length === 0) {
    return 0;
  }
  return this.bascket.reduce((total, item) => {
    if (!item.productId || typeof item.productId.weight !== 'number') {
      return total;
    }
    return total + (item.productId.weight * item.count);
  }, 0);
});

// Add indexes
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema); 