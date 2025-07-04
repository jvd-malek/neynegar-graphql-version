const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: [true, 'نام الزامی است'],
    minLength: [4, 'نام باید حداقل 4 کاراکتر باشد'],
    maxLength: [10, 'نام نمی‌تواند بیشتر از 10 کاراکتر باشد'],
    trim: true
  },
  lastname: {
    type: String,
    required: [true, 'نام خانوادگی الزامی است'],
    minLength: [4, 'نام خانوادگی باید حداقل 4 کاراکتر باشد'],
    maxLength: [20, 'نام خانوادگی نمی‌تواند بیشتر از 20 کاراکتر باشد'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
authorSchema.virtual('fullName').get(function() {
  return `${this.firstname} ${this.lastname}`;
});

// Virtual for articles
authorSchema.virtual('articles', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'authorId'
});

// Add indexes
authorSchema.index({ firstname: 1, lastname: 1 });

module.exports = mongoose.model('Author', authorSchema); 