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
    discount: Number
  }],
  bascket: [{
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
    minLength: [10, 'آدرس باید حداقل 10 کاراکتر باشد'],
    maxLength: [500, 'آدرس نمی‌تواند بیشتر از 500 کاراکتر باشد'],
    trim: true
  },
  postCode: {
    type: Number,
    min: [1000000000, 'کد پستی باید 10 رقمی باشد'],
    max: [9999999999, 'کد پستی باید 10 رقمی باشد']
  },
  totalBuy: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'مبلغ کل خرید نمی‌تواند منفی باشد']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Normalize phone number before saving
userSchema.pre('save', function(next) {
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
userSchema.pre('findOneAndUpdate', function(next) {
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
userSchema.virtual('totalPrice').get(function() {
  return this.bascket.reduce((total, item) => {
    if (item.productId.discount[item.productId.discount.length - 1].discount > 0) {
      return total + (item.count * (item.productId.price[item.productId.price.length - 1].price * ((100 - item.productId.discount[item.productId.discount.length - 1].discount) / 100)));
    } else {
      return total + (item.count * item.productId.price[item.productId.price.length - 1].price);
    }
  }, 0);
});

// Virtual for total discount calculation
userSchema.virtual('totalDiscount').get(function() {
  return this.bascket.reduce((total, item) => {
    if (item.productId.discount[item.productId.discount.length - 1].discount > 0) {
      return total + (item.count * (item.productId.price[item.productId.price.length - 1].price * ((item.productId.discount[item.productId.discount.length - 1].discount) / 100)));
    } else {
      return 0;
    }
  }, 0);
});

// Virtual for total weight calculation
userSchema.virtual('totalWeight').get(function() {
  return this.bascket.reduce((total, item) => {
    return total + (item.productId.weight * item.count);
  }, 0);
});

// Add indexes
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema); 