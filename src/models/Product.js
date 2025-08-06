const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان محصول الزامی است'],
    minLength: [3, 'عنوان محصول باید حداقل 3 کاراکتر باشد'],
    maxLength: [60, 'عنوان محصول نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  desc: {
    type: String,
    required: [true, 'توضیحات محصول الزامی است'],
    minLength: [3, 'توضیحات محصول باید حداقل 3 کاراکتر باشد'],
    maxLength: [600, 'توضیحات محصول نمی‌تواند بیشتر از 600 کاراکتر باشد'],
    trim: true
  },
  price: [{
    price: {
      type: Number,
      required: true,
      min: [0, 'قیمت نمی‌تواند منفی باشد']
    },
    date: {
      type: String,
      required: true
    }
  }],
  cost: [{
    cost: {
      type: Number,
      required: true,
      min: [0, 'هزینه نمی‌تواند منفی باشد']
    },
    date: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true,
      min: [0, 'تعداد نمی‌تواند منفی باشد']
    }
  }],
  discount: [{
    discount: {
      type: Number,
      required: true,
      min: [0, 'تخفیف نمی‌تواند منفی باشد'],
      max: [100, 'تخفیف نمی‌تواند بیشتر از 100 درصد باشد']
    },
    date: {
      type: Number,
      required: true
    }
  }],
  count: {
    type: Number,
    required: [true, 'تعداد محصول الزامی است'],
    min: [0, 'تعداد محصول نمی‌تواند منفی باشد']
  },
  showCount: {
    type: Number,
    required: [true, 'تعداد نمایش الزامی است'],
    min: [0, 'تعداد نمایش نمی‌تواند منفی باشد']
  },
  totalSell: {
    type: Number,
    required: [true, 'تعداد کل فروش الزامی است'],
    min: [0, 'تعداد کل فروش نمی‌تواند منفی باشد']
  },
  popularity: {
    type: Number,
    default: 5,
    min: [0, 'محبوبیت نمی‌تواند منفی باشد']
  },
  authorId: {
    type: mongoose.Types.ObjectId,
    ref: 'Author'
  },
  authorArticleId: {
    type: mongoose.Types.ObjectId,
    ref: 'Article'
  },
  publisherArticleId: {
    type: mongoose.Types.ObjectId,
    ref: 'Article'
  },
  productArticleId: {
    type: mongoose.Types.ObjectId,
    ref: 'Article'
  },
  publisher: {
    type: String,
    default: '',
    maxLength: [60, 'نام ناشر نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  publishDate: {
    type: String,
    default: '',
    maxLength: [60, 'تاریخ انتشار نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  brand: {
    type: String,
    default: '',
    maxLength: [60, 'نام برند نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  status: {
    type: String,
    required: [true, 'وضعیت کیفیت محصول الزامی است'],
    maxLength: [60, 'وضعیت محصول نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    enum: ['نو', 'درحد‌نو', 'دسته‌دوم']
  },
  state: {
    type: String,
    required: [true, 'وضعیت محصول الزامی است'],
    maxLength: [60, 'وضعیت محصول نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    enum: ['active', 'inactive', 'outOfStock', 'comingSoon' , "callForPrice"]
  },
  size: {
    type: String,
    default: '',
    maxLength: [60, 'سایز نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  weight: {
    type: Number,
    required: [true, 'وزن محصول الزامی است'],
    min: [50, 'وزن محصول باید حداقل 50 گرم باشد']
  },
  majorCat: {
    type: String,
    required: [true, 'دسته‌بندی اصلی الزامی است'],
    minLength: [3, 'دسته‌بندی اصلی باید حداقل 3 کاراکتر باشد'],
    maxLength: [60, 'دسته‌بندی اصلی نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  minorCat: {
    type: String,
    required: [true, 'دسته‌بندی فرعی الزامی است'],
    minLength: [3, 'دسته‌بندی فرعی باید حداقل 3 کاراکتر باشد'],
    maxLength: [60, 'دسته‌بندی فرعی نمی‌تواند بیشتر از 60 کاراکتر باشد'],
    trim: true
  },
  cover: {
    type: String,
    required: [true, 'تصویر اصلی الزامی است']
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return !v.includes(this.cover);
      },
      message: 'تصاویر نمی‌توانند شامل تصویر اصلی باشند'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pre-save middleware to handle dynamic updates
productSchema.pre('findOneAndUpdate', function(next) {
  this.options.runValidators = true;
  this.options.new = true;
  next();
});

// Add method to get current price
productSchema.methods.getCurrentPrice = function() {
  return this.price[this.price.length - 1]?.price || 0;
};

// Add method to get current cost
productSchema.methods.getCurrentCost = function() {
  return this.cost[this.cost.length - 1]?.cost || 0;
};

// Add method to get current discount
productSchema.methods.getCurrentDiscount = function() {
  return this.discount[this.discount.length - 1]?.discount || 0;
};

// Virtual for comments
productSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'productId'
});

// Add indexes
productSchema.index({ title: 'text', desc: 'text' });
productSchema.index({ majorCat: 1, minorCat: 1 });
productSchema.index({ status: 1 });
productSchema.index({ popularity: -1 });

module.exports = mongoose.model('Product', productSchema); 