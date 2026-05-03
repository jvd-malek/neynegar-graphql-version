const userModel = require('../../models/User');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendSms = require('../../utils/sendSms');
const codeModel = require("../../models/Code");
const salt = bcrypt.genSaltSync(10);
const ShippingCost = require('../../models/ShippingCost');
const Course = require('../../models/Course');
const Product = require('../../models/Product');
const Package = require('../../models/Package');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@neynegar1.ir',
  process.env.push_notification_public_key,
  process.env.push_notification_server_key
);

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
            .populate('bascket.packageId')
            .populate('favorite.productId')
            .populate('readingList.articleId')
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
        .populate('bascket.packageId')
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
          select: '_id title desc cover entry sections popularity'
        })
    },
    userFullBasket: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const populatedUser = await userModel.findById(user._id)
        .populate("bascket.productId");

      // آرایه‌ای برای نگهداری آیتم‌هایی که باید حذف یا آپدیت شن
      const basketUpdates = [];
      const itemsToRemove = [];

      const userPackages = populatedUser.bascket
        .filter(item => item.target === "Package" && item.packageId !== null);

      // populate packages seperatly
      let populatedPackages = [];
      if (userPackages.length > 0) {
        const packageIds = userPackages.map(item => item.packageId)
        const packages = await Package.find({ _id: { $in: packageIds } })
          .populate('products.product');

        populatedPackages = userPackages.map((item) => {
          const pkg = packages.find(p => p._id.toString() === item.packageId.toString());
          return { target: item.target, packageId: pkg, count: item.count };
        });
      }

      let subtotal = 0;
      let totalDiscount = 0;
      let total = 0;
      let totalWeight = 0;

      const enrichedBasket = [];

      // -----------------------------------------------------
      // 1) PRODUCT ITEMS (با چک موجودی)
      // -----------------------------------------------------
      for (const item of populatedUser.bascket.filter(i => i.productId)) {
        const p = item.productId;

        // 🚫 چک موجودی: اگر showCount صفره، حذف کن از سبد
        if (!p || p.showCount <= 0) {
          itemsToRemove.push({ type: 'product', id: p?._id });
          continue;
        }

        // 📊 چک تعداد: اگر تعداد در سبد بیشتر از موجودیه، کمش کن
        let finalCount = item.count;
        if (item.count > p.showCount) {
          finalCount = p.showCount;
          basketUpdates.push({
            type: 'product',
            id: p._id,
            newCount: finalCount
          });
        }

        const itemPrice = p.currentPrice || 0;
        const currentDiscount = p.currentDiscount || 0;
        const discountAmountPerUnit = itemPrice * (currentDiscount / 100);
        const itemTotalPrice = itemPrice * finalCount;
        const itemTotalDiscount = discountAmountPerUnit * finalCount;
        const finalItemPrice = p.finalPrice * finalCount;
        const weight = (p.weight || 0) * finalCount;

        subtotal += itemTotalPrice;
        totalDiscount += itemTotalDiscount;
        total += finalItemPrice;
        totalWeight += weight;

        enrichedBasket.push({
          count: finalCount,
          productId: {
            _id: p._id,
            title: p.title,
            price: itemPrice,
            discount: currentDiscount,
            showCount: p.showCount,
            state: p.state,
            weight: p.weight,
            cover: p.cover
          },
          packageId: null,
          currentPrice: itemPrice,
          currentDiscount,
          itemTotal: finalItemPrice,
          itemDiscount: itemTotalDiscount,
          itemWeight: weight
        });
      }

      // -----------------------------------------------------
      // 2) PACKAGE ITEMS (با چک موجودی)
      // -----------------------------------------------------
      for (const item of populatedPackages.filter(i => i.packageId)) {
        const pkg = item.packageId;

        // 🚫 چک موجودی پکیج: اگر showCount صفره یا isAvailable false هست
        if (!pkg || pkg.showCount <= 0) {
          itemsToRemove.push({ type: 'package', id: pkg?._id });
          continue;
        }

        // 📊 چک تعداد پکیج
        let finalCount = item.count;
        if (item.count > pkg.showCount) {
          finalCount = pkg.showCount;
          basketUpdates.push({
            type: 'package',
            id: pkg._id,
            newCount: finalCount
          });
        }

        const price = pkg.totalPrice;
        const currentDiscount = pkg.currentDiscount;
        const discountAmountPerUnit = price * (currentDiscount / 100);
        const itemTotalPrice = price * finalCount;
        const itemTotalDiscount = discountAmountPerUnit * finalCount;
        const finalPrice = itemTotalPrice - itemTotalDiscount;
        const weight = (pkg.totalWeight || 0) * finalCount;

        subtotal += itemTotalPrice;
        totalDiscount += itemTotalDiscount;
        total += finalPrice;
        totalWeight += weight;

        enrichedBasket.push({
          count: finalCount,
          productId: null,
          packageId: {
            _id: pkg._id,
            title: pkg.title,
            price: price,
            discount: currentDiscount,
            showCount: pkg.showCount,
            state: pkg.state,
            weight: pkg.totalWeight,
            cover: pkg.cover
          },
          currentPrice: price,
          currentDiscount,
          itemTotal: finalPrice,
          itemDiscount: itemTotalDiscount,
          itemWeight: weight
        });
      }

      // 💾 اعمال تغییرات روی سبد خرید کاربر در دیتابیس
      if (itemsToRemove.length > 0 || basketUpdates.length > 0) {
        // سبد خرید اصلی (populate نشده) رو از دیتابیس بگیر
        const freshUser = await userModel.findById(user._id).select('bascket');
        let updatedBasket = [...freshUser.bascket];

        // ۱. حذف آیتم‌های ناموجود
        if (itemsToRemove.length > 0) {
          updatedBasket = updatedBasket.filter(item => {
            if (item.productId) {
              return !itemsToRemove.some(r => r.type === 'product' && r.id?.toString() === item.productId.toString());
            }
            if (item.packageId) {
              return !itemsToRemove.some(r => r.type === 'package' && r.id?.toString() === item.packageId.toString());
            }
            return true;
          });
        }

        // ۲. آپدیت تعداد آیتم‌ها
        if (basketUpdates.length > 0) {
          updatedBasket = updatedBasket.map(item => {
            if (item.productId) {
              const update = basketUpdates.find(u => u.type === 'product' && u.id?.toString() === item.productId.toString());
              if (update) {
                return {
                  target: item.target || 'Product',
                  productId: item.productId,
                  packageId: null,
                  count: update.newCount
                };
              }
            }
            if (item.packageId) {
              const update = basketUpdates.find(u => u.type === 'package' && u.id?.toString() === item.packageId.toString());
              if (update) {
                return {
                  target: item.target || 'Package',
                  productId: null,
                  packageId: item.packageId,
                  count: update.newCount
                };
              }
            }
            return item;
          });
        }

        // ۳. ذخیره در دیتابیس
        await userModel.findByIdAndUpdate(user._id, { bascket: updatedBasket });
      }

      // ---------------------------------------
      // shipping cost 
      // ---------------------------------------
      const shippingType = "پست";
      const shippingCostDoc = await ShippingCost.findOne({ type: shippingType });

      let shippingCost = 0;
      if (shippingCostDoc) {
        shippingCost =
          shippingCostDoc.cost +
          shippingCostDoc.costPerKg * (totalWeight / 1000);
      } else {
        shippingCost = (totalWeight * 10) + 16000;
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
      };
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
      try {
        await sendSms({
          to: phone,
          patternCode: process.env.SMS_VERIFICATION_PATTERN || process.env.SMS_PROMO_PATTERN || 'ispyrv56rhgo2yb',
          inputData: [{ 'verification-code': ranCode, name }]
        });
        console.log('Code:', ranCode);
      } catch (e) {
        console.error('SMS Error:', e);
      }
      return true;
    },

    verifyCode: async (_, { phone, code, name, basket }) => {
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

      // حذف کد بعد از استفاده موفق
      await codeModel.findOneAndDelete({ phone });

      // یافتن یا ساخت کاربر 
      let user = await userModel.findOne({ phone });

      if (!user) {
        // کاربر جدید - ساخت اکانت با سبد خرید مهمان
        const Phone = normalizedPhone(phone);

        // فیلتر کردن سبد خرید برای حذف آیتم‌های تکراری
        const uniqueBasket = [];
        const seenProducts = new Set();
        const seenPackages = new Set();

        if (basket && basket.length > 0) {
          for (const item of basket) {
            if (item.productId) {
              const key = `product_${item.productId}`;
              if (!seenProducts.has(key)) {
                seenProducts.add(key);
                uniqueBasket.push({
                  target: 'Product',
                  productId: item.productId,
                  count: item.count
                });
              }
            } else if (item.packageId) {
              const key = `package_${item.packageId}`;
              if (!seenPackages.has(key)) {
                seenPackages.add(key);
                uniqueBasket.push({
                  target: 'Package',
                  packageId: item.packageId,
                  count: item.count
                });
              }
            }
          }
        }

        user = await userModel.create({
          name,
          phone: Phone,
          status: "user",
          bascket: uniqueBasket,
          favorite: [],
          discount: [],
          totalBuy: 0
        });

      } else {
        // کاربر موجود - merge سبد خرید مهمان با سبد خرید کاربر

        if (basket && basket.length > 0) {
          // تبدیل سبد خرید فعلی به مپ برای دسترسی سریع‌تر
          const currentBasketMap = new Map();

          for (const item of user.bascket) {
            if (item.productId) {
              currentBasketMap.set(`product_${item.productId.toString()}`, {
                target: item.target || 'Product',
                id: item.productId.toString(),
                count: item.count,
              });
            } else if (item.packageId) {
              currentBasketMap.set(`package_${item.packageId.toString()}`, {
                target: item.target || 'Package',
                id: item.packageId.toString(),
                count: item.count,
              });
            }
          }

          // اضافه کردن آیتم‌های جدید از سبد مهمان
          for (const item of basket) {
            if (item.productId) {
              const key = `product_${item.productId}`;
              const existing = currentBasketMap.get(key);

              if (existing) {
                // اگر محصول وجود دارد، تعداد رو جمع کن
                existing.count += item.count;
              } else {
                // اگر محصول جدید است، اضافه کن
                currentBasketMap.set(key, {
                  target: 'Product',
                  id: item.productId,
                  count: item.count
                });
              }
            } else if (item.packageId) {
              const key = `package_${item.packageId}`;
              const existing = currentBasketMap.get(key);

              if (existing) {
                // اگر پکیج وجود دارد، تعداد رو جمع کن
                existing.count += item.count;
              } else {
                // اگر پکیج جدید است، اضافه کن
                currentBasketMap.set(key, {
                  target: 'Package',
                  id: item.packageId,
                  count: item.count
                });
              }
            }
          }

          // تبدیل مپ به آرایه با فرمت صحیح
          const mergedBasket = [];
          for (const item of currentBasketMap.values()) {
            if (item.target === 'Product') {
              mergedBasket.push({
                target: 'Product',
                productId: item.id,
                count: item.count
              });
            } else if (item.target === 'Package') {
              mergedBasket.push({
                target: 'Package',
                packageId: item.id,
                count: item.count
              });
            }
          }

          // آپدیت سبد خرید کاربر
          user.bascket = mergedBasket;
          await user.save();
        }
      }

      // populate کاربر برای برگرداندن به فرانت
      const populatedUser = await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('bascket.packageId')

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_KEY,
        { expiresIn: "90d" }
      );

      return { token, user: populatedUser };
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

    pushProductToBasket: async (_, { productId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // دریافت showCount از مدل محصول
      const product = await Product.findById(productId);

      // اگه تعداد درخواستی بیشتر از حد مجازه
      if (count > product.showCount) {
        throw new Error(`حداکثر ${product.showCount} عدد موجود است`);
      }

      if (!product) throw new Error("Product not found");

      const showCount = product.showCount || 1;

      // پیدا کردن آیتم فعلی در سبد
      const existingItem = User.bascket.find(
        item => item?.productId?.toString() === productId
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
        User.bascket.push({ target: "Product", productId, count: Math.min(count, showCount) });
      }

      await User.save();

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('bascket.packageId')
    },

    pushPackageToBasket: async (_, { packageId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // پکیج رو با populate محصولاتش بگیر
      const pack = await Package.findById(packageId).populate('products.product');

      // اگه تعداد درخواستی بیشتر از حد مجازه
      if (count > pack.showCount) {
        throw new Error(`حداکثر ${pack.showCount} عدد موجود است`);
      }

      if (!pack) throw new Error("Package not found");
      const showCount = pack.showCount || 1;

      // پیدا کردن آیتم فعلی در سبد
      const existingItem = User.bascket.find(
        item => item?.packageId?.toString() === packageId
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
        User.bascket.push({ target: "Package", packageId, count: Math.min(count, showCount) });
      }

      await User.save();

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('bascket.packageId')
    },

    pullProductFromBasket: async (_, { productId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // پیدا کردن آیتم در سبد
      const itemIndex = User.bascket.findIndex(item => item?.productId?.toString() === productId);

      if (itemIndex !== -1) {
        if (User.bascket[itemIndex].count > count) {
          User.bascket[itemIndex].count -= count;
        } else {
          // اگر تعداد به صفر رسید، حذف کن
          User.bascket.splice(itemIndex, 1);
        }
        await User.save();
      }

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('bascket.packageId')
    },

    pullPackageFromBasket: async (_, { packageId, count }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const User = await userModel.findById(user._id);
      if (!User) throw new Error("User not found");

      // پیدا کردن آیتم در سبد
      const itemIndex = User.bascket.findIndex(item => item?.packageId?.toString() === packageId);
      if (itemIndex !== -1) {
        if (User.bascket[itemIndex].count > count) {
          User.bascket[itemIndex].count -= count;
        } else {
          // اگر تعداد به صفر رسید، حذف کن
          User.bascket.splice(itemIndex, 1);
        }
        await User.save();
      }

      return await userModel.findById(user._id)
        .populate('bascket.productId')
        .populate('bascket.packageId')
    },

    addToFavorite: async (_, { productId }, { user }) => {
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
      User.discount.push({ code, discount, date, status: "active" });
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
          await Course.findByIdAndUpdate(courseId, { $inc: { entry: 1 } });
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
    },

    savePushSubscription: async (_, { subscription }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const updatedUser = await userModel.findByIdAndUpdate(
        user._id,
        { subscription },
        { new: true }
      );

      return updatedUser;
    },

    sendPushNotification: async (_, { userId, title, body }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner")
        throw new Error("Only admin can send notifications");

      const targetUser = await userModel.findById(userId);
      if (!targetUser || !targetUser.subscription) throw new Error("No subscription found");

      const payload = JSON.stringify({ title, body });

      try {
        await webpush.sendNotification(targetUser.subscription, payload);
        return true;
      } catch (err) {
        console.error("Push error:", err);
        throw new Error("Failed to send notification");
      }
    }
  }
};

module.exports = userResolvers; 