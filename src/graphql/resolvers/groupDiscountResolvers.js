const GroupDiscount = require('../../models/GroupDiscount');
const Product = require('../../models/Product');
const Alert = require('../../models/Alert');

const groupDiscountResolvers = {
  Query: {
    groupDiscounts: async (_, { majorCat, minorCat, brand }) => {
      const query = {};
      if (majorCat) query.majorCat = majorCat;
      if (minorCat) query.minorCat = minorCat;
      if (brand) query.brand = brand;
      // // فقط تخفیف‌هایی که هنوز منقضی نشده‌اند را برگردان
      // const now = Date.now();
      // query.endDate = { $gte: now };
      return await GroupDiscount.find(query).sort({ startDate: -1 });
    },
    activeGroupDiscounts: async () => {
      const now = Date.now();
      return await GroupDiscount.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).sort({ startDate: -1 });
    }
  },
  Mutation: {
    createGroupDiscount: async (_, { input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');

      const days = Number(input.endDate);
      const now = Date.now();
      const endDateTimestamp = days * 24 * 60 * 60 * 1000 + now;
      const discount = new GroupDiscount({ ...input, endDate: endDateTimestamp, startDate: now });
      const savedDiscount = await discount.save();

      // پیدا کردن محصولات مرتبط و جایگزینی کل discount
      const productQuery = { majorCat: input.majorCat };
      if (input.minorCat) productQuery.minorCat = input.minorCat;
      if (input.brand) productQuery.brand = input.brand;

      await Product.updateMany(
        productQuery,
        { $set: { discount: [{ discount: input.discount, date: endDateTimestamp }] } }
      );

      // آلرت برای همه کاربران
      const categoryText = input.minorCat
        ? `${input.majorCat} ${input.minorCat}`
        : input.majorCat;

      const brandText = input.brand ? ` برند ${input.brand}` : '';

      await Alert.create({
        title: `🔥 ${input.discount}٪ تخفیف ویژه روی ${categoryText}`,
        body: `فرصت استثنایی! ${input.title}\n\n${input.discount}٪ تخفیف ویژه روی تمام محصولات ${categoryText}${brandText} فعال شد.\n\n⏰ فقط ${days} روز فرصت داری!\nهمین حالا محصولات مورد علاقه‌ات رو با تخفیف ویژه بخر.`,
        target: 'all',
        source: 'discount',
        sourceId: savedDiscount._id.toString()
      });

      return savedDiscount;
    },
    updateGroupDiscount: async (_, { id, input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');

      const prevDiscount = await GroupDiscount.findById(id);
      if (!prevDiscount) throw new Error('GroupDiscount not found');

      const updateInput = {};
      let hasSignificantChange = false;
      let alertTitle = '';
      let alertBody = '';

      if (typeof input.discount !== 'undefined' && input.discount !== prevDiscount.discount) {
        updateInput.discount = input.discount;
        hasSignificantChange = true;

        if (input.discount > prevDiscount.discount) {
          alertTitle = `🎉 تخفیف ${prevDiscount.title} بیشتر شد!`;
          alertBody = `خبر خوب! تخفیف ${prevDiscount.title} از ${prevDiscount.discount}٪ به ${input.discount}٪ افزایش پیدا کرد.\n\nفرصت رو از دست نده، همین الان محصولات مورد نظرت رو با تخفیف بیشتر بخر!`;
        } else {
          alertTitle = `⚡ بروزرسانی تخفیف ${prevDiscount.title}`;
          alertBody = `تخفیف ${prevDiscount.title} به ${input.discount}٪ تغییر کرد.\n\nاگه هنوز دست به کاری نشدی، وقتشه که از این فرصت استفاده کنی!`;
        }
      }

      if (typeof input.endDate !== 'undefined') {
        const days = Number(input.endDate);
        updateInput.endDate = days * 24 * 60 * 60 * 1000 + Date.now();
        hasSignificantChange = true;

        alertTitle = alertTitle || `⏰ تمدید تخفیف ${prevDiscount.title}`;
        alertBody = alertBody
          ? `${alertBody}\n\n🎁 همچنین زمان تخفیف تا ${days} روز دیگه تمدید شد!`
          : `خبر خوش! مهلت استفاده از تخفیف ${prevDiscount.title} تمدید شد.\n\n⏰ فقط ${days} روز دیگه فرصت داری تا از این تخفیف ویژه استفاده کنی.\n\nهمین حالا خرید کن و پولت رو پس‌انداز کن!`;
      }

      const updatedDiscount = await GroupDiscount.findByIdAndUpdate(id, updateInput, { new: true, runValidators: true });

      const productQuery = { majorCat: prevDiscount.majorCat };
      if (prevDiscount.minorCat) productQuery.minorCat = prevDiscount.minorCat;
      if (prevDiscount.brand) productQuery.brand = prevDiscount.brand;

      await Product.updateMany(
        productQuery,
        { $set: { discount: [{ discount: updatedDiscount.discount, date: updatedDiscount.endDate }] } }
      );

      if (hasSignificantChange) {
        await Alert.create({
          title: alertTitle,
          body: alertBody,
          target: 'all',
          source: 'discount',
          sourceId: id
        });
      }

      return updatedDiscount;
    },
    deleteGroupDiscount: async (_, { id }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      // حذف تخفیف گروهی و حذف تخفیف از محصولات مرتبط
      const discount = await GroupDiscount.findById(id);
      if (discount) {
        const productQuery = { majorCat: discount.majorCat };
        if (discount.minorCat) productQuery.minorCat = discount.minorCat;
        if (discount.brand) productQuery.brand = discount.brand;
        await Product.updateMany(productQuery, { $set: { discount: [] } });
      }
      const res = await GroupDiscount.findByIdAndDelete(id);
      return !!res;
    }
  }
};

module.exports = groupDiscountResolvers; 