const userModel = require('../../models/User');

const userResolvers = {
  Query: {
    users: async (_, { page = 1, limit = 10, search = '' }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const skip = (page - 1) * limit;

        // Create search query
        const searchQuery = search ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        } : {};

        const [users, total] = await Promise.all([
          userModel.find(searchQuery)
            .populate('bascket.productId')
            .populate('favorite.productId')
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          userModel.countDocuments(searchQuery)
        ]);

        return {
          users,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت کاربران");
      }
    },
    user: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized")

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId')
    },
    userByPhone: async (_, { phone }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      // نرمال‌سازی شماره تلفن
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('98')) {
        normalizedPhone = normalizedPhone.substring(2);
      } else if (normalizedPhone.startsWith('+98')) {
        normalizedPhone = normalizedPhone.substring(3);
      }
      if (!normalizedPhone.startsWith('09')) {
        normalizedPhone = '09' + normalizedPhone;
      }
      if (normalizedPhone.length !== 11) {
        throw new Error('شماره تلفن نامعتبر است');
      }
      return await userModel.findOne({ phone: normalizedPhone });
    },
    userByToken: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await user
    },
    userFullBasket: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const populatedUser = await userModel.findById(user._id)
        .populate("bascket.productId");

      let subtotal = 0;
      let totalDiscount = 0;
      let total = 0;
      let totalWeight = 0;

      const isDiscountValid = (discount) => {
        if (!discount || !discount.date) return false;
        const now = Date.now();
        const discountDate = discount.date
        return now <= discountDate;
      };

      const enrichedBasket = populatedUser.bascket
        .filter(item => item.productId) // فقط آیتم‌هایی که محصول دارند را در نظر بگیر
        .map(item => {
          const product = item.productId;

          // دریافت آخرین قیمت و تخفیف
          const latestPriceEntry = product.price[product.price.length - 1];
          const latestDiscountEntry = product.discount[product.discount.length - 1];

          const currentPrice = latestPriceEntry?.price || 0;
          const currentDiscount = isDiscountValid(latestDiscountEntry) ? (latestDiscountEntry?.discount || 0) : 0;
          const productWeight = product.weight || 0;

          const itemDiscountAmount = currentPrice * (currentDiscount / 100);
          const itemTotal = (currentPrice - itemDiscountAmount) * item.count;
          const itemWeight = productWeight * item.count;

          subtotal += currentPrice * item.count;
          totalDiscount += itemDiscountAmount * item.count;
          total += itemTotal;
          totalWeight += itemWeight;

          return {
            count: item.count,
            productId: {
              _id: product._id.toString(),
              title: product.title,
              desc: product.desc,
              weight: product.weight,
              cover: product.cover,
              brand: product.brand,
              status: product.status,
              majorCat: product.majorCat,
              minorCat: product.minorCat,
              popularity: product.popularity,
              price: currentPrice,
              discount: currentDiscount,
              discountRaw: product.discount,
              showCount: product.showCount
            },
            currentPrice,
            currentDiscount,
            itemTotal,
            itemDiscount: itemDiscountAmount * item.count,
            itemWeight
          };
        });

      const shippingCost = (totalWeight * 7) + 90000;

      return {
        user,
        basket: enrichedBasket,
        subtotal,
        totalDiscount,
        total,
        totalWeight,
        shippingCost,
        grandTotal: total + shippingCost,
        state: true
      }
    }
  },

  Mutation: {
    createUser: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = new userModel({
        ...input,
        totalBuy: 0
      });
      return await User.save();
    },

    updateUser: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      return await userModel.findByIdAndUpdate(id, input, { new: true });
    },

    deleteUser: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const result = await userModel.findByIdAndDelete(id);
      return !!result;
    },

    addToBasket: async (_, { userId, productId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      const existingItem = User.bascket.find(
        item => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.count += count;
      } else {
        User.bascket.push({ productId, count });
      }

      return await User.save();
    },

    removeFromBasket: async (_, { userId, productId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.bascket = User.bascket.filter(
        item => item.productId.toString() !== productId
      );
      return await User.save();
    },

    addToFavorite: async (_, { userId, productId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      if (!User.favorite.some(item => item.productId.toString() === productId)) {
        User.favorite.push({ productId });
      }
      return await User.save();
    },

    removeFromFavorite: async (_, { userId, productId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.favorite = User.favorite.filter(
        item => item.productId.toString() !== productId
      );
      return await User.save();
    },

    addToReadingList: async (_, { userId, articleId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      if (!User.readingList.some(item => item.articleId.toString() === articleId)) {
        User.readingList.push({ articleId });
      }
      return await User.save();
    },

    removeFromReadingList: async (_, { userId, articleId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.readingList = User.readingList.filter(
        item => item.articleId.toString() !== articleId
      );
      return await User.save();
    },

    updateUserAddress: async (_, { userId, address, postCode }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      return await userModel.findByIdAndUpdate(
        userId,
        { address, postCode },
        { new: true }
      );
    },

    addDiscount: async (_, { userId, code, discount, date }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.discount.push({ code, discount, date });
      return await User.save();
    },

    removeDiscount: async (_, { userId, code }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.discount = User.discount.filter(d => d.code !== code);
      return await User.save();
    },

    updateBasketCount: async (_, { userId, productId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      const basketItem = User.bascket.find(item => item.productId.toString() === productId);

      if (basketItem) {
        basketItem.count = count;
      }

      return await User.save();
    }
  }
};

module.exports = userResolvers; 