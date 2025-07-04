const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  txt: {
    type: String,
    required: [true, 'متن لینک الزامی است'],
    minLength: [4, 'متن لینک باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'متن لینک نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'مسیر لینک الزامی است'],
    trim: true
  },
  sort: {
    type: [Number],
    required: [true, 'ترتیب الزامی است'],
    minLength: [1, 'حداقل یک عدد برای ترتیب الزامی است'],
    maxLength: [6, 'حداکثر 6 عدد برای ترتیب مجاز است'],
    validate: {
      validator: function(v) {
        return v.every(num => num >= 0);
      },
      message: 'اعداد ترتیب نمی‌توانند منفی باشند'
    }
  },
  subLinks: [{
    link: {
      type: String,
      required: [true, 'لینک زیرمجموعه الزامی است'],
      trim: true
    },
    path: {
      type: String,
      required: [true, 'مسیر زیرمجموعه الزامی است'],
      trim: true
    },
    brand: [{
      type: String,
      trim: true
    }]
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes
linkSchema.index({ path: 1 });
linkSchema.index({ 'subLinks.path': 1 });
linkSchema.index({ 'subLinks.brand': 1 });

module.exports = mongoose.model('Link', linkSchema); 