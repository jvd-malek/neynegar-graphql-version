const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { verifypayment } = require('../../middleware/zarinpal');
const Package = require('../../models/Package');
const jalaali = require('jalaali-js');
const sendSms = require('../../utils/sendSms');

function toPersianDate(date) {
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1; // ماه میلادی از 0 شروع میشه
  const gDay = date.getDate();

  const { jy, jm, jd } = jalaali.toJalaali(gYear, gMonth, gDay);

  return {
    year: jy,
    month: jm - 1,          // چون می‌خوای مثل قبل از 0 شروع بشه
    monthName: persianMonths[jm - 1],
    day: jd
  };
}

const orderResolvers = {
  Query: {
    orders: async (_, { page = 1, limit = 10, search = '' }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const skip = (page - 1) * limit;

        // Create search query
        const searchQuery = search ? {
          $or: [
            { 'userId.name': { $regex: search, $options: 'i' } },
            { 'userId.phone': { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } }
          ]
        } : {};

        const [orders, total] = await Promise.all([
          Order.find(searchQuery)
            .populate({
              path: 'userId',
              select: '_id name phone address postCode'
            })
            .populate({
              path: 'products.productId',
            })
            .populate({
              path: 'products.packageId',
            })
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          Order.countDocuments(searchQuery)
        ]);

        return {
          orders,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت سفارشات");
      }
    },
    order: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Order.findById(id)
        .populate({
          path: 'userId',
          select: '_id name phone email address postCode'
        })
        .populate({
          path: 'products.productId',
          select: '_id title cover brand status'
        })
        .populate({
          path: 'products.packageId',
        })
    },
    ordersByUser: async (_, { page = 1, limit = 10 }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const skip = (page - 1) * limit;
      const [orders, total] = await Promise.all([
        Order.find({ userId: user._id })
          .populate({
            path: 'userId',
            select: '_id name phone email address postCode'
          })
          .populate({
            path: 'products.productId',
            select: '_id title cover brand status'
          })
          .populate({
            path: 'products.packageId',
          })
          .skip(skip)
          .limit(limit)
          .sort({ _id: -1 }),
        Order.countDocuments({ userId: user._id })
      ]);

      return {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    ordersByStatus: async (_, { status }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Order.find({ status: { $in: Array.isArray(status) ? status : [status] } })
        .populate({
          path: 'userId',
          select: '_id name phone address postCode'
        })
        .populate({
          path: 'products.productId',
          select: '_id title cover brand status'
        })
        .populate({
          path: 'products.packageId',
        })
    },
    freeOrders: async (_, { page = 1, limit = 10, search = '' }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const skip = (page - 1) * limit;

        // Create search query for free orders
        const searchQuery = {
          isFreeOrder: true,
          ...(search ? {
            $or: [
              { 'userId.name': { $regex: search, $options: 'i' } },
              { 'userId.phone': { $regex: search, $options: 'i' } },
              { status: { $regex: search, $options: 'i' } }
            ]
          } : {})
        };

        const [orders, total] = await Promise.all([
          Order.find(searchQuery)
            .populate({
              path: 'userId',
              select: '_id name phone address postCode'
            })
            .populate({
              path: 'products.productId',
            })
            .populate({
              path: 'products.packageId',
            })
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          Order.countDocuments(searchQuery)
        ]);

        return {
          orders,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت سفارشات آزاد");
      }
    },
    salesAnalytics: async (_, { year: persianYear }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        // محاسبه سال شمسی جاری اگر سال داده نشده
        let targetPersianYear = persianYear;
        if (!targetPersianYear) {
          const now = new Date();
          const currentPersian = toPersianDate(now);
          targetPersianYear = currentPersian.year;
        }

        // تبدیل سال شمسی به میلادی
        const startGregorian = jalaali.toGregorian(targetPersianYear, 1, 1);
        const endMonth = jalaali.isLeapJalaaliYear(targetPersianYear) ? 30 : 29;
        const endGregorian = jalaali.toGregorian(targetPersianYear, 12, endMonth);

        const startOfYear = new Date(startGregorian.gy, startGregorian.gm - 1, startGregorian.gd);
        const endOfYear = new Date(endGregorian.gy, endGregorian.gm - 1, endGregorian.gd, 23, 59, 59);

        // استفاده از lean() برای پرفورمنس بهتر
        const orders = await Order.find({
          status: { $nin: ["پرداخت نشده", "لغو شد"] },
          createdAt: {
            $gte: startOfYear.getTime(),
            $lte: endOfYear.getTime()
          }
        })
          .select('products totalPrice shippingCost isFreeOrder createdAt')
          .populate({
            path: 'products.productId',
            select: 'title price cost totalSell weight'
          })
          .populate({
            path: 'products.packageId',
            select: 'title totalSell products',
            populate: {
              path: 'products.product',
              select: 'title price cost totalSell weight finalPrice'
            }
          })
          .lean()
          .sort({ createdAt: 1 });

        const monthNames = [
          'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
          'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ];

        // Initialize months with Map for better performance
        const monthlyData = new Array(12).fill(null).map((_, i) => ({
          month: monthNames[i],
          year: targetPersianYear,
          totalOrders: 0,
          totalRevenue: 0,
          totalShippingCost: 0,
          totalProfit: 0,
          freeOrders: 0,
          paidOrders: 0,
          freeOrderRevenue: 0,
          paidOrderRevenue: 0,
          products: new Map(),
          packages: new Map()
        }));

        const allProductStats = new Map();
        const allPackageStats = new Map();

        // پردازش سفارشات
        for (const order of orders) {
          const orderDate = new Date(order.createdAt);
          const persianDate = toPersianDate(orderDate);

          if (persianDate.year !== targetPersianYear) continue;

          const monthIndex = persianDate.month;
          const monthData = monthlyData[monthIndex];

          const priceInToman = order.totalPrice / 10;
          const shippingCostInToman = order.shippingCost || 0;

          monthData.totalOrders++;
          monthData.totalRevenue += priceInToman;
          monthData.totalShippingCost += shippingCostInToman;

          if (order.isFreeOrder) {
            monthData.freeOrders++;
            monthData.freeOrderRevenue += priceInToman;
          } else {
            monthData.paidOrders++;
            monthData.paidOrderRevenue += priceInToman;
          }

          let orderProfit = 0;

          for (const item of order.products) {
            // پردازش محصول تکی
            if (item.productId) {
              const productId = item.productId._id.toString();
              const productCost = item.productId.cost?.length
                ? item.productId.cost[item.productId.cost.length - 1].cost
                : 0;
              const productRevenue = (item.price * item.count);
              const productProfit = productRevenue - (productCost * item.count);

              orderProfit += productProfit;

              // آمار ماهانه
              let prodStats = monthData.products.get(productId);
              if (!prodStats) {
                prodStats = {
                  product: item.productId,
                  totalCount: 0,
                  totalRevenue: 0,
                  totalProfit: 0,
                  allTimeSales: item.productId.totalSell || 0
                };
                monthData.products.set(productId, prodStats);
              }
              prodStats.totalCount += item.count;
              prodStats.totalRevenue += productRevenue;
              prodStats.totalProfit += productProfit;

              // آمار سالانه
              let yearStats = allProductStats.get(productId);
              if (!yearStats) {
                yearStats = {
                  product: item.productId,
                  totalCount: 0,
                  totalRevenue: 0,
                  totalProfit: 0,
                  allTimeSales: item.productId.totalSell || 0
                };
                allProductStats.set(productId, yearStats);
              }
              yearStats.totalCount += item.count;
              yearStats.totalRevenue += productRevenue;
              yearStats.totalProfit += productProfit;
            }
            // پردازش پکیج
            else if (item.packageId) {
              const packageId = item.packageId._id.toString();
              const packageRevenue = (item.price * item.count);
              let packageProfit = 0;

              // آمار ماهانه پکیج
              let pkgStats = monthData.packages.get(packageId);
              if (!pkgStats) {
                pkgStats = {
                  package: item.packageId,
                  totalCount: 0,
                  totalRevenue: 0,
                  totalProfit: 0,
                  allTimeSales: item.packageId.totalSell || 0
                };
                monthData.packages.set(packageId, pkgStats);
              }
              pkgStats.totalCount += item.count;
              pkgStats.totalRevenue += packageRevenue;

              // آمار سالانه پکیج
              let yearPkgStats = allPackageStats.get(packageId);
              if (!yearPkgStats) {
                yearPkgStats = {
                  package: item.packageId,
                  totalCount: 0,
                  totalRevenue: 0,
                  totalProfit: 0,
                  allTimeSales: item.packageId.totalSell || 0
                };
                allPackageStats.set(packageId, yearPkgStats);
              }
              yearPkgStats.totalCount += item.count;
              yearPkgStats.totalRevenue += packageRevenue;

              // پردازش محصولات داخل پکیج
              if (item.packageId.products) {
                for (const pkgProduct of item.packageId.products) {
                  if (!pkgProduct.product) continue;

                  const innerProductId = pkgProduct.product._id.toString();
                  const quantityInPackage = pkgProduct.quantity * item.count;
                  const innerProductCost = pkgProduct.product.cost?.length
                    ? pkgProduct.product.cost[pkgProduct.product.cost.length - 1].cost
                    : 0;
                  const innerProductRevenue = (pkgProduct.product.finalPrice || 0) * quantityInPackage;
                  const innerProductProfit = innerProductRevenue - (innerProductCost * quantityInPackage);

                  packageProfit += innerProductProfit;

                  // آمار ماهانه محصول داخل پکیج
                  let innerStats = monthData.products.get(innerProductId);
                  if (!innerStats) {
                    innerStats = {
                      product: pkgProduct.product,
                      totalCount: 0,
                      totalRevenue: 0,
                      totalProfit: 0,
                      allTimeSales: pkgProduct.product.totalSell || 0
                    };
                    monthData.products.set(innerProductId, innerStats);
                  }
                  innerStats.totalCount += quantityInPackage;
                  innerStats.totalRevenue += innerProductRevenue;
                  innerStats.totalProfit += innerProductProfit;

                  // آمار سالانه محصول داخل پکیج
                  let yearInnerStats = allProductStats.get(innerProductId);
                  if (!yearInnerStats) {
                    yearInnerStats = {
                      product: pkgProduct.product,
                      totalCount: 0,
                      totalRevenue: 0,
                      totalProfit: 0,
                      allTimeSales: pkgProduct.product.totalSell || 0
                    };
                    allProductStats.set(innerProductId, yearInnerStats);
                  }
                  yearInnerStats.totalCount += quantityInPackage;
                  yearInnerStats.totalRevenue += innerProductRevenue;
                  yearInnerStats.totalProfit += innerProductProfit;
                }
              }

              pkgStats.totalProfit += packageProfit;
              yearPkgStats.totalProfit += packageProfit;
              orderProfit += packageProfit;
            }
          }

          monthData.totalProfit += orderProfit;
        }

        // تبدیل Map به Array و مرتب‌سازی
        const monthlyDataArray = monthlyData.map(month => {
          
            // محصولات برتر ماه - فقط ۱۰ تای اول
          const products = Array.from(month.products.values())
            .sort((a, b) =>
              b.totalProfit - a.totalProfit ||
              b.totalCount - a.totalCount ||
              b.allTimeSales - a.allTimeSales
            )
            .slice(0, 10);

          // پکیج‌های برتر ماه - فقط ۱۰ تای اول
          const packages = Array.from(month.packages.values())
            .sort((a, b) =>
              b.totalProfit - a.totalProfit ||
              b.totalCount - a.totalCount ||
              b.allTimeSales - a.allTimeSales
            )
            .slice(0, 10);

          // محاسبه سود خالص و حاشیه سود
          const netProfit = month.totalProfit - month.totalShippingCost;
          const profitMargin = month.totalRevenue > 0 ? (month.totalProfit / month.totalRevenue) * 100 : 0;
          const netProfitMargin = month.totalRevenue > 0 ? (netProfit / month.totalRevenue) * 100 : 0;

          return {
            month: month.month,
            year: month.year,
            totalOrders: month.totalOrders,
            totalRevenue: month.totalRevenue,
            totalShippingCost: month.totalShippingCost,
            totalProfit: month.totalProfit,
            netProfit,
            profitMargin,
            netProfitMargin,
            freeOrders: month.freeOrders,
            paidOrders: month.paidOrders,
            freeOrderRevenue: month.freeOrderRevenue,
            paidOrderRevenue: month.paidOrderRevenue,
            products,
            packages
          };
        });

        // محصولات و پکیج‌های برتر سال
        const topProducts = Array.from(allProductStats.values())
          .sort((a, b) =>
            b.totalProfit - a.totalProfit ||
            b.totalCount - a.totalCount ||
            b.allTimeSales - a.allTimeSales
          ).slice(0, 10);

        const topPackages = Array.from(allPackageStats.values())
          .sort((a, b) =>
            b.totalProfit - a.totalProfit ||
            b.totalCount - a.totalCount ||
            b.allTimeSales - a.allTimeSales
          ).slice(0, 10);

        // محاسبه مجموع‌های نهایی با یک پاس
        let totalRevenue = 0, totalOrders = 0, totalFreeOrders = 0;
        let totalShippingCostAll = 0, totalProfitAll = 0, totalNetProfit = 0;

        for (const month of monthlyDataArray) {
          totalRevenue += month.totalRevenue;
          totalOrders += month.totalOrders;
          totalFreeOrders += month.freeOrders;
          totalShippingCostAll += month.totalShippingCost;
          totalProfitAll += month.totalProfit;
          totalNetProfit += month.netProfit;
        }

        return {
          monthlyData: monthlyDataArray,
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          freeOrderPercentage: totalOrders > 0 ? (totalFreeOrders / totalOrders) * 100 : 0,
          totalShippingCost: totalShippingCostAll,
          totalProfit: totalProfitAll,
          netProfit: totalNetProfit,
          profitMargin: totalRevenue > 0 ? (totalProfitAll / totalRevenue) * 100 : 0,
          netProfitMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
          topProducts,
          topPackages
        };
      } catch (error) {
        throw new Error("خطا در دریافت آمار فروش: " + error.message);
      }
    }
  },

  Mutation: {
    createOrder: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const order = new Order(input);
      const savedOrder = await order.save();

      // Update user's totalBuy
      const userObj = await User.findById(input.userId);
      userObj.totalBuy += input.totalPrice;
      await userObj.save();

      // Update products' totalSell and showCount
      for (const product of input.products) {
        const productDoc = await Product.findById(product.productId);
        if (productDoc) {
          const newShowCount = productDoc.showCount - product.count;
          const newCount = Math.max(0, productDoc.count - product.count);
          const finalPrice = (product.price - (product.price * (product.discount / 100))) * product.count;
          // If showCount becomes 0 and count is still greater than 0, set showCount to 1
          const finalShowCount = (newShowCount <= 0 && newCount > 0) ? 1 : Math.max(0, newShowCount);

          await Product.findByIdAndUpdate(product.productId, {
            $inc: {
              totalSell: finalPrice
            },
            $set: {
              showCount: finalShowCount,
              count: newCount
            }
          });
        }
      }

      return savedOrder;
    },

    updateOrder: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Order.findByIdAndUpdate(id, input, { new: true });
    },

    deleteOrder: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      const result = await Order.findByIdAndDelete(id);
      return !!result;
    },

    updateOrderStatus: async (_, { id, status }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
    },

    updateOrderPayment: async (_, { id, paymentId }) => {
      return await Order.findByIdAndUpdate(
        id,
        { paymentId },
        { new: true }
      );
    },

    updateOrderPostVerify: async (_, { id, postVerify }) => {
      return await Order.findByIdAndUpdate(
        id,
        { postVerify },
        { new: true }
      );
    },

    verifyOrderPayment: async (_, { orderId }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const order = await Order.findById(orderId);

      if (!order) throw new Error("Order not found");
      if (order.status !== "پرداخت نشده") return order;

      const verifyRes = await verifypayment({
        amountInRial: order.totalPrice,
        authority: order.authority
      });

      if (verifyRes && verifyRes.data && verifyRes.data.code === 100 || verifyRes.data.code === 101) {
        order.status = "در انتظار تایید";
        order.paymentId = verifyRes.data.ref_id;
        await order.save();

        const userObj = await User.findById(order.userId);
        if (userObj) {


          // حذف سبد خرید کاربر پس از ثبت سفارش
          userObj.bascket = []

          // منقضی کردن کد تخفیف
          if (order.discountCode) {
            userObj.discount = userObj.discount.map(d =>
              d.code === order.discountCode ? { ...d, status: 'inactive' } : d
            );
          }

          userObj.totalBuy += order.totalPrice;
          await userObj.save();

          // ارسال پیامک
          try {
            await sendSms({
              to: userObj.phone,
              patternCode: process.env.SMS_VERIFICATION_ORDER_PATTERN || '037jmuk6r1aw757',
              inputData: [{ "name": userObj.name }]
            });
          } catch (e) {
            console.error('SMS Error:', e);
          }
        }

        // کاهش موجودی محصولات و پکیج‌ها
        for (const item of order.products) {

          // 1. کاهش موجودی محصول تکی
          if (item.productId) {
            const productDoc = await Product.findById(item.productId);
            if (productDoc) {
              const newShowCount = productDoc.showCount - item.count;
              const newCount = Math.max(0, productDoc.count - item.count);
              const finalShowCount = (newShowCount <= 0 && newCount > 0) ? 1 : Math.max(0, newShowCount);

              await Product.findByIdAndUpdate(item.productId, {
                $inc: { totalSell: item.count },
                $set: { showCount: finalShowCount, count: newCount }
              });
            }
          }

          // 2. کاهش موجودی پکیج و محصولات داخل آن
          else if (item.packageId) {
            const packageDoc = await Package.findById(item.packageId).populate('products.product');
            if (packageDoc) {

              await Package.findByIdAndUpdate(item.packageId, {
                $inc: { totalSell: item.count },
              });

              // کاهش موجودی تک‌تک محصولات داخل پکیج
              for (const pkgProduct of packageDoc.products) {
                const prod = pkgProduct.product;
                const quantityInPackage = pkgProduct.quantity * item.count; // تعداد کل مصرف شده از این محصول

                if (prod) {
                  const newShowCount = prod.showCount - quantityInPackage;
                  const newCount = Math.max(0, prod.count - quantityInPackage);
                  const finalShowCount = (newShowCount <= 0 && newCount > 0) ? 1 : Math.max(0, newShowCount);

                  await Product.findByIdAndUpdate(prod._id, {
                    $inc: { totalSell: quantityInPackage },
                    $set: { showCount: finalShowCount, count: newCount }
                  });
                }
              }
            }
          }
        }

        return order;
      } else {
        throw new Error("پرداخت تایید نشد");
      }
    },

    createFreeOrder: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        // Find or create user for free order
        let customerUser = await User.findOne({ phone: input.customerPhone });

        if (!customerUser) {
          // Create new user for the customer
          let userInputs = {
            status: 'user',
            name: input.customerName,
            phone: input.customerPhone,
            totalBuy: 0,
            bascket: [],
            favorite: [],
            readingList: [],
            discount: [],
            courseProgress: []
          }

          if (input.customerAddress.length > 0) {
            userInputs.address = input.customerAddress;
          }
          if (input.customerPostCode.length > 2) {
            userInputs.postCode = input.customerPostCode;
          }

          customerUser = new User(userInputs);
          await customerUser.save();
        } else {
          // Update existing user info with new data
          customerUser.name = input.customerName;
          if (input.customerAddress.length > 0) {
            customerUser.address = input.customerAddress;
          }
          if (input.customerPostCode > 0) {
            customerUser.postCode = input.customerPostCode;
          }
          await customerUser.save();
        }

        // Create the free order
        const orderData = {
          products: input.products, // اینجا دیگر input کامل است
          submition: input.submition,
          totalPrice: input.totalPrice * 10,
          discount: input.discount || 0,
          discountCode: input.discountCode || '',
          status: input.status || 'در انتظار تایید',
          authority: 'free-order-' + Date.now(),
          userId: customerUser._id,
          isFreeOrder: true
        };

        const order = new Order(orderData);
        const savedOrder = await order.save();

        // بروزرسانی موجودی (همان منطق verifyOrderPayment)
        for (const item of input.products) {
          if (item.productId) {
            // منطق کاهش موجودی محصول
            const productDoc = await Product.findById(item.productId);
            if (productDoc) {
              const newShowCount = productDoc.showCount - item.count;
              const newCount = Math.max(0, productDoc.count - item.count);
              const finalShowCount = (newShowCount <= 0 && newCount > 0) ? 1 : Math.max(0, newShowCount);
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { totalSell: item.count },
                $set: { showCount: finalShowCount, count: newCount }
              });
            }
          } else if (item.packageId) {
            // منطق کاهش موجودی پکیج (کپی از verifyOrderPayment)
            const packageDoc = await Package.findById(item.packageId).populate('products.product');
            if (packageDoc) {
              const newPackageShowCount = packageDoc.showCount - item.count;
              const newPackageCount = Math.max(0, packageDoc.count - item.count);
              const finalPackageShowCount = (newPackageShowCount <= 0 && newPackageCount > 0) ? 1 : Math.max(0, newPackageShowCount);

              await Package.findByIdAndUpdate(item.packageId, {
                $inc: { totalSell: item.count },
                $set: { showCount: finalPackageShowCount, count: newPackageCount }
              });

              for (const pkgProduct of packageDoc.products) {
                const prod = pkgProduct.product;
                const quantityInPackage = pkgProduct.quantity * item.count;
                if (prod) {
                  const newShowCount = prod.showCount - quantityInPackage;
                  const newCount = Math.max(0, prod.count - quantityInPackage);
                  const finalShowCount = (newShowCount <= 0 && newCount > 0) ? 1 : Math.max(0, newShowCount);
                  await Product.findByIdAndUpdate(prod._id, {
                    $inc: { totalSell: quantityInPackage },
                    $set: { showCount: finalShowCount, count: newCount }
                  });
                }
              }
            }
          }
        }

        return savedOrder;
      } catch (error) {
        throw new Error("خطا در ایجاد سفارش آزاد: " + error.message);
      }
    }

  }
};

module.exports = orderResolvers; 