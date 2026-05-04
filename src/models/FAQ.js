const mongoose = require('mongoose');

const faqTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام گروه سوالات الزامی است'],
    minLength: [3, 'نام گروه باید حداقل 3 کاراکتر باشد'],
    maxLength: [100, 'نام گروه نمی‌تواند بیشتر از 100 کاراکتر باشد'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'دسته‌بندی الزامی است'],
    enum: ['کتاب', 'لوازم خوشنویسی', 'گالری', 'مقالات', 'دوره‌ها', 'عمومی'],
    trim: true
  },
  faqs: [{
    question: {
      type: String,
      required: [true, 'سوال الزامی است'],
      maxLength: [300, 'سوال نمی‌تواند بیشتر از 300 کاراکتر باشد'],
      trim: true
    },
    answer: {
      type: String,
      required: [true, 'جواب الزامی است'],
      maxLength: [1000, 'جواب نمی‌تواند بیشتر از 1000 کاراکتر باشد'],
      trim: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validate duplicate questions within template
faqTemplateSchema.pre('save', function(next) {
  const questions = this.faqs.map(f => f.question);
  const uniqueQuestions = new Set(questions);
  if (questions.length !== uniqueQuestions.size) {
    next(new Error('سوالات تکراری در یک گروه مجاز نیست'));
  }
  next();
});

// Indexes
faqTemplateSchema.index({ category: 1, isActive: 1 });
faqTemplateSchema.index({ name: 1 });

module.exports = mongoose.model('FAQTemplate', faqTemplateSchema);