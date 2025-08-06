const userModel = require('../../models/User');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const request = require("request");
const codeModel = require("../../models/Code");
const salt = bcrypt.genSaltSync(10);
const ShippingCost = require('../../models/ShippingCost');
const Course = require('../../models/Course');
const Product = require('../../models/Product');

const normalizedPhone = (phone) => {
  let normalizedPhone = phone.replace(/\D/g, '');

  if (normalizedPhone.startsWith('98')) {
    normalizedPhone = normalizedPhone.substring(2);
  }

  if (!normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
    normalizedPhone = '0' + normalizedPhone;
  }

  if (!/^09\d{9}$/.test(normalizedPhone)) {
    throw new Error('شماره تلفن نامعتبر است');
  }

  return normalizedPhone
}

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
            .populate('readingList.articleId')
            .populate({
              path: 'courseProgress.courseId',
              select: '_id title desc cover views popularity sections images prerequisites articleId createdAt updatedAt'
            })
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
      const User = await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate({
          path: 'readingList.articleId',
          populate: {
            path: 'authorId',
            select: '_id firstname lastname fullName'
          }
        })
        .populate({
          path: 'courseProgress.courseId',
          select: '_id title desc cover views popularity sections images prerequisites articleId createdAt updatedAt'
        })
        
      return User
    },
    userByPhone: async (_, { phone }) => {

      // نرمال‌سازی شماره تلفن
      const Phone = normalizedPhone(phone)
      return await userModel.findOne({ phone: Phone });
    },
    userByToken: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate({
          path: 'readingList.articleId',
          populate: {
            path: 'authorId',
            select: '_id firstname lastname fullName'
          }
        })
        .populate({
          path: 'courseProgress.courseId',
          select: '_id title desc cover views popularity sections images prerequisites articleId createdAt updatedAt'
        })
    },
    userFullBasket: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const populatedUser = await userModel.findById(user._id)
        .populate("bascket.productId")
        .populate('favorite.productId')
        .populate({
          path: 'readingList.articleId',
          populate: {
            path: 'authorId',
            select: '_id firstname lastname fullName'
          }
        })
        .populate({
          path: 'courseProgress.courseId',
          select: '_id title desc cover views popularity sections images prerequisites articleId createdAt updatedAt'
        });

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

      // نوع ارسال را از user.address یا یک مقدار پیش‌فرض بگیر (اینجا فرض می‌کنیم همیشه 'پست')
      const shippingType = 'پست';
      // هزینه ارسال را از مدل ShippingCost پیدا کن
      const shippingCostDoc = await ShippingCost.findOne({ type: shippingType });
      let shippingCost = 0;
      if (shippingCostDoc) {
        shippingCost = shippingCostDoc.cost + (shippingCostDoc.costPerKg * totalWeight / 1000);
      }

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
    sendVerificationCode: async (_, { phone, name }) => {
      const ranCode = Math.floor(Math.random() * 99999);
      const hashedCode = bcrypt.hashSync(String(ranCode), salt);

      // حذف کد قبلی اگه هست 
      await codeModel.findOneAndDelete({ phone });
      await codeModel.create({
        phone,
        code: hashedCode,
        exTime: Date.now() + 180000,
        count: 0,
      });

      // ارسال پیامک
      request.post({
        url: "http://ippanel.com/api/select",
        body: {
          op: "pattern",
          user: "u09960025507",
          pass: "Faraz@1834690023902711",
          fromNum: "3000505",
          toNum: phone,
          patternCode: "ispyrv56rhgo2yb",
          inputData: [{ "verification-code": ranCode, "name": name }]
        },
        json: true
      },
        (err, res, body) => {
          if (err) console.error("SMS Error:", err);
          else console.log("SMS sent:", body); console.log("Code:", ranCode);
        });
      return true;
    },

    verifyCode: async (_, { phone, code, name, basket }, context) => {
      const codeDoc = await codeModel.findOne({ phone });

      if (!codeDoc) throw new Error("کد یافت نشد");
      if (codeDoc.exTime < Date.now() || codeDoc.count > 4) {
        throw new Error("کد منقضی شده است");
      }

      const isMatch = bcrypt.compareSync(String(code), codeDoc.code);

      if (!isMatch) {
        codeDoc.count += 1;
        await codeDoc.save();
        throw new Error("کد نادرست است");
      }

      // یافتن یا ساخت کاربر 
      let user = await userModel.findOne({ phone });
      if (!user) {
        const Phone = normalizedPhone(phone)
        user = await userModel.create({
          name,
          phone: Phone,
          status: "user",
          bascket: basket || [],
          favorite: [],
          discount: [],
          totalBuy: 0
        });
      } else if (basket && basket.length > 0) {
        // اگر کاربر قبلاً وجود داشته و سبد خرید جدید دارد، آیتم‌های جدید را اضافه کن (بدون تکرار)
        basket.forEach(item => {
          if (!user.bascket.some(b => b.productId.toString() === item.productId)) {
            user.bascket.push(item);
          }
        });
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_KEY,
        { expiresIn: "90d" }
      );

      return { token, user };
    },

    createUser: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      const Phone = normalizedPhone(input.phone)
      const User = new userModel({
        ...input,
        phone: Phone,
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

    addToBasket: async (_, { productId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // دریافت showCount از مدل محصول
      const product = await Product.findById(productId);
      if (!product) throw new Error("Product not found");
      const showCount = product.showCount || 1;

      // پیدا کردن آیتم فعلی در سبد
      const existingItem = User.bascket.find(
        item => item.productId.toString() === productId
      );

      if (existingItem) {
        // اگر تعداد جدید بیشتر از showCount بود، محدود کن
        if (existingItem.count + count <= showCount) {
          existingItem.count += count;
        } else {
          existingItem.count = showCount;
        }
      } else {
        // اگر آیتم جدید است، اضافه کن (ولی بیشتر از showCount نشود)
        User.bascket.push({ productId, count: Math.min(count, showCount) });
      }

      await User.save();

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
    },

    removeFromBasket: async (_, { productId }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // پیدا کردن آیتم در سبد
      const itemIndex = User.bascket.findIndex(item => item.productId.toString() === productId);
      if (itemIndex !== -1) {
        if (User.bascket[itemIndex].count > 1) {
          User.bascket[itemIndex].count -= 1;
        } else {
          // اگر تعداد به صفر رسید، حذف کن
          User.bascket.splice(itemIndex, 1);
        }
        await User.save();
      }

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
    },

    addToFavorite: async (_, {productId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(user._id);
      if (!User.favorite.some(item => item.productId.toString() === productId)) {
        User.favorite.push({ productId });
      }
      await User.save();

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
    },

    removeFromFavorite: async (_, { productId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(user._id);
      User.favorite = User.favorite.filter(
        item => item.productId.toString() !== productId
      );
      await User.save();

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
    },

    addToReadingList: async (_, { userId, articleId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      if (!User.readingList.some(item => item.articleId.toString() === articleId)) {
        User.readingList.push({ articleId });
      }
      await User.save();

      return await userModel.findById(userId)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
    },

    removeFromReadingList: async (_, { userId, articleId }, { user }) => {
      if (!user) throw new Error("Unauthorized")

      const User = await userModel.findById(userId);
      User.readingList = User.readingList.filter(
        item => item.articleId.toString() !== articleId
      );
      await User.save();

      return await userModel.findById(userId)
        .populate('bascket.productId')
        .populate('favorite.productId')
        .populate('readingList.articleId');
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
    },

    updateCourseProgress: async (_, { courseId, progress }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const userDoc = await userModel.findById(user._id);
      if (!userDoc) throw new Error("کاربر یافت نشد");
      
      // پیدا کردن رکورد دوره
      const progressObj = userDoc.courseProgress.find(cp => cp.courseId.toString() === courseId);
      const isFirstTime = !progressObj; // آیا این اولین بار است که کاربر progress ثبت می‌کند؟
      
      if (progressObj) {
        progressObj.progress = progress;
      } else {
        userDoc.courseProgress.push({ courseId, progress });
        
        // اگر اولین بار است، views دوره را افزایش بده
        if (isFirstTime) {
          await Course.findByIdAndUpdate(courseId, { $inc: { views: 1 } });
        }
      }
      
      await userDoc.save();
      return userDoc;
    },

    updateUserStatus: async (_, { status }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const updatedUser = await userModel.findByIdAndUpdate(
        user._id,
        { status },
        { new: true }
      );
      return updatedUser;
    }
  }
};

module.exports = userResolvers; 