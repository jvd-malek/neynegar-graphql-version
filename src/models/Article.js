const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Types.ObjectId,
    ref: 'Author',
    required: [true, 'شناسه نویسنده الزامی است']
  },
  title: {
    type: String,
    required: [true, 'عنوان مقاله الزامی است'],
    minLength: [4, 'عنوان مقاله باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'عنوان مقاله نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    trim: true
  },
  minorCat: {
    type: String,
    required: [true, 'دسته‌بندی فرعی الزامی است'],
    minLength: [4, 'دسته‌بندی فرعی باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'دسته‌بندی فرعی نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    trim: true
  },
  majorCat: {
    type: String,
    required: [true, 'دسته‌بندی اصلی الزامی است'],
    minLength: [4, 'دسته‌بندی اصلی باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'دسته‌بندی اصلی نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    trim: true
  },
  desc: {
    type: String,
    required: [true, 'توضیحات مقاله الزامی است'],
    minLength: [10, 'توضیحات مقاله باید حداقل 10 کاراکتر باشد'],
    trim: true
  },
  content: {
    type: [String],
    required: [true, 'محتوی مقاله الزامی است'],
    trim: true
  },
  subtitles: {
    type: [String],
    required: [true, 'عناوین زیر مجموعه مقاله الزامی است'],
    trim: true
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'تعداد بازدید نمی‌تواند منفی باشد']
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
        // Ensure images array doesn't contain the cover image
        return !v.includes(this.cover);
      },
      message: 'تصاویر نمی‌توانند شامل تصویر اصلی باشند'
    }
  },
  popularity: {
    type: Number,
    default: 5,
    min: [0, 'محبوبیت نمی‌تواند منفی باشد']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comments
articleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'articleId'
});

// Add indexes
articleSchema.index({ title: 'text', desc: 'text', content: 'text' });
articleSchema.index({ majorCat: 1, minorCat: 1 });
articleSchema.index({ authorId: 1 });
articleSchema.index({ popularity: -1 });
articleSchema.index({ views: -1 });

module.exports = mongoose.model('Article', articleSchema); 