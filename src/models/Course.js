const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'عنوان دوره الزامی است'],
        minLength: [3, 'عنوان دوره باید حداقل 3 کاراکتر باشد'],
        maxLength: [60, 'عنوان دوره نمی‌تواند بیشتر از 60 کاراکتر باشد'],
        trim: true
    },
    desc: {
        type: String,
        required: [true, 'توضیحات دوره الزامی است'],
        minLength: [3, 'توضیحات دوره باید حداقل 3 کاراکتر باشد'],
        // maxLength: [1000, 'توضیحات دوره نمی‌تواند بیشتر از 1000 کاراکتر باشد'],
        trim: true
    },
    popularity: {
        type: Number,
        default: 5,
        min: [0, 'محبوبیت نمی‌تواند منفی باشد']
    },
    articleId: {
        type: mongoose.Types.ObjectId,
        ref: 'Article'
    },
    sections: [{
        title: {
            type: String,
            required: [true, 'عنوان محتوا الزامی است'],
            trim: true
        },
        txt: {
            type: [String],
            required: [true, 'متن محتوا الزامی است'],
            trim: true
        },
        images: {
            type: [Number],
            default: []
        },
    }],
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
            validator: function (v) {
                // Ensure images array doesn't contain the cover image
                return !v.includes(this.cover);
            },
            message: 'تصاویر نمی‌توانند شامل تصویر اصلی باشند'
        }
    },
    prerequisites: [{
        type: mongoose.Types.ObjectId,
        ref: 'Course'
    }],
    category: {
        type: String,
        required: true,
        trim: true
    },
    relatedProducts: [{
        type: mongoose.Types.ObjectId,
        ref: 'Product',
    }],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


// Add indexes
courseSchema.index({ title: 'text', desc: 'text', content: 'text' });
courseSchema.index({ views: -1 });
courseSchema.index({ popularity: -1 });

module.exports = mongoose.model('Course', courseSchema); 