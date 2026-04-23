const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'عنوان بسته الزامی است'],
        minLength: [3, 'عنوان بسته باید حداقل 3 کاراکتر باشد'],
        maxLength: [60, 'عنوان بسته نمی‌تواند بیشتر از 60 کاراکتر باشد'],
        trim: true
    },
    desc: {
        type: String,
        required: [true, 'توضیحات بسته الزامی است'],
        minLength: [3, 'توضیحات بسته باید حداقل 3 کاراکتر باشد'],
        maxLength: [600, 'توضیحات بسته نمی‌تواند بیشتر از 600 کاراکتر باشد'],
        trim: true
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
    status: {
        type: String,
        required: [true, 'وضعیت کیفیت بسته الزامی است'],
        enum: ['نو', 'درحد‌نو', 'دسته‌دوم']
    },
    state: {
        type: String,
        required: [true, 'وضعیت بسته الزامی است'],
        enum: ['active', 'inactive', 'outOfStock', 'comingSoon', 'callForPrice']
    },
    category: {
        type: String,
        required: [true, 'دسته‌بندی الزامی است'],
        enum: ['اقتصادی', 'استاندارد', 'پریمیوم']
    },
    brand: {
        type: String,
        default: '',
        maxLength: [60, 'نام برند نمی‌تواند بیشتر از 60 کاراکتر باشد'],
        trim: true
    },
    cover: {
        type: String,
        required: [true, 'تصویر اصلی الزامی است']
    },
    discount: [{
        discount: {
            type: Number,
            min: [0, 'تخفیف نمی‌تواند منفی باشد'],
            max: [100, 'تخفیف نمی‌تواند بیشتر از 100 درصد باشد']
        },
        date: {
            type: Number,
            required: true
        }
    }],
    // ✅ هر محصول با تعدادش
    products: [
        {
            product: {
                type: mongoose.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                default: 1,
                min: [1, 'تعداد هر محصول باید حداقل ۱ باشد']
            }
        }
    ],
},
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

packageSchema.virtual('currentDiscount').get(function () {
    const now = Date.now()
    const discount = this.discount;
    const currentDiscount = discount?.at(-1)?.date > now ? discount?.at(-1).discount : 0

    return currentDiscount;
});

// Virtual برای محاسبه کل قیمت محصولات داخل پکیج
packageSchema.virtual('totalPrice').get(function () {
    if (!this.products || this.products.length === 0) {
        return 0;
    }

    let calculatedTotalPrice = 0;

    for (const item of this.products) {
        if (item.product && typeof item.product.finalPrice === 'number') {
            calculatedTotalPrice += item.product.finalPrice * item.quantity;
        }
    }
    return calculatedTotalPrice;
});

// Virtual برای محاسبه کل وزن محصولات داخل پکیج
packageSchema.virtual('totalWeight').get(function () {
    let calculatedTotalWeight = 0;
    if (!this.products || this.products.length === 0) {
        return 0;
    }

    for (const item of this.products) {
        if (item.product && item.product.weight) {
            calculatedTotalWeight += item.product.weight * item.quantity;
        }
    }
    return calculatedTotalWeight;
});

// Virtual برای محاسبه نهایی قیمت پکیج (با اعمال تخفیف خود پکیج)
packageSchema.virtual('finalPrice').get(function () {
    const totalPrice = this.totalPrice; // از virtual قبلی استفاده می‌کنیم
    const discount = this.discount;
    const now = Date.now()

    const discountPercent = discount?.at(-1)?.date > now ? discount?.at(-1).discount : 0
    const discountAmount = discountPercent ? totalPrice * (discountPercent / 100) : 0
    const finalCalculatedPrice = totalPrice - discountAmount;

    return finalCalculatedPrice;
});

// ✅ Virtual برای تعداد کل محصولات در بسته
packageSchema.virtual('totalProducts').get(function () {
    return this.products?.reduce((sum, p) => sum + (p.quantity || 1), 0) || 0;
});


// Virtual برای دونستن حداکثر تعداد قابل فروش
packageSchema.virtual('showCount').get(function () {
    if (!this.populated('products.product')) return 0;

    let min = Infinity;

    for (const item of this.products) {
        if (!item.product) return 0;

        // تقسیم موجودی بر تعداد مورد نیاز
        const available = Math.floor(item.product.showCount / item.quantity);
        min = Math.min(min, available);
    }

    return min === Infinity ? 0 : min;
});

// برای اینکه virtualها در JSON خروجی ظاهر شوند، این خط را اضافه کنید
packageSchema.set('toJSON', { virtuals: true });
packageSchema.set('toObject', { virtuals: true });
// ✅ ایندکس‌ها
packageSchema.index({ title: 'text', desc: 'text' });
packageSchema.index({ category: 1 });
packageSchema.index({ state: 1 });
packageSchema.index({ popularity: -1 });

// ✅ متدهای کمکی
packageSchema.methods.getSummary = function () {
    return {
        id: this._id,
        title: this.title,
        totalPrice: this.totalPrice,
        finalPrice: this.finalPrice,
        discount: this.totalDiscount,
        weight: this.totalWeight,
        totalProducts: this.totalProducts
    };
};


module.exports = mongoose.model('Package', packageSchema);
