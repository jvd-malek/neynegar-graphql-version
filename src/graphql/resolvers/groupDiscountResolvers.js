const GroupDiscount = require('../../models/GroupDiscount');
const Product = require('../../models/Product');

const groupDiscountResolvers = {
  Query: {
    groupDiscounts: async (_, { majorCat, minorCat, brand }) => {
      const query = {};
      if (majorCat) query.majorCat = majorCat;
      if (minorCat) query.minorCat = minorCat;
      if (brand) query.brand = brand;
      // فقط تخفیف‌هایی که هنوز منقضی نشده‌اند را برگردان
      const now = Date.now();
      query.endDate = { $gte: now };
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
      // تبدیل endDate از روز به timestamp
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

      return savedDiscount;
    },
    updateGroupDiscount: async (_, { id, input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      // فقط اجازه ویرایش discount و endDate را بده
      const prevDiscount = await GroupDiscount.findById(id);
      if (!prevDiscount) throw new Error('GroupDiscount not found');
      const updateInput = {};
      if (typeof input.discount !== 'undefined') updateInput.discount = input.discount;
      if (typeof input.endDate !== 'undefined') {
        const days = Number(input.endDate);
        updateInput.endDate = days * 24 * 60 * 60 * 1000 + Date.now();
      }
      // سایر فیلدها (majorCat, minorCat, brand) را تغییر نده
      const updatedDiscount = await GroupDiscount.findByIdAndUpdate(id, updateInput, { new: true, runValidators: true });
      // آپدیت محصولات مرتبط
      const productQuery = { majorCat: prevDiscount.majorCat };
      if (prevDiscount.minorCat) productQuery.minorCat = prevDiscount.minorCat;
      if (prevDiscount.brand) productQuery.brand = prevDiscount.brand;
      await Product.updateMany(
        productQuery,
        { $set: { discount: [{ discount: updatedDiscount.discount, date: updatedDiscount.endDate }] } }
      );
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