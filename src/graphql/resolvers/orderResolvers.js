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
    salesAnalytics: async (_, { year = new Date().getFullYear() }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        // Get all orders for the year
        const orders = await Order.find({
          status: { $nin: ["پرداخت نشده", "لغو شد"] },
          createdAt: {
            $gte: startOfYear.getTime(),
            $lte: endOfYear.getTime()
          }
        })
          .populate('userId', 'name phone')
          .populate({
            path: 'products.productId',
          })
          .populate({
            path: 'products.packageId',
          })


        // Group orders by month
        const monthlyData = {};
        const monthNames = [
          'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
          'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ];

        // Initialize all months
        for (let i = 0; i < 12; i++) {
          monthlyData[i] = {
            month: monthNames[i],
            year: year,
            totalOrders: 0,
            totalRevenue: 0,
            freeOrders: 0,
            paidOrders: 0,
            freeOrderRevenue: 0,
            paidOrderRevenue: 0,
            products: []
          };
        }

        // کل محصولات برای آمار سالانه
        const allProductStats = {};

        // Process each order
        orders.forEach(order => {
          const orderDate = new Date(Number(order.createdAt));
          const persianDate = toPersianDate(orderDate);

          // Use the month index (0-11)
          const monthIndex = persianDate.month;

          // Convert from Rial to Toman (divide by 10)
          const priceInToman = order.totalPrice / 10;

          monthlyData[monthIndex].totalOrders++;
          monthlyData[monthIndex].totalRevenue += priceInToman;

          if (order.isFreeOrder) {
            monthlyData[monthIndex].freeOrders++;
            monthlyData[monthIndex].freeOrderRevenue += priceInToman;
          } else {
            monthlyData[monthIndex].paidOrders++;
            monthlyData[monthIndex].paidOrderRevenue += priceInToman;
          }

          order.products.forEach(item => {
            // آمار ماهانه
            const pId = item.productId._id.toString();
            let prod = monthlyData[monthIndex].products.find(p => p.product._id.toString() === pId);
            if (!prod) {
              prod = {
                product: item.productId,
                totalCount: 0,
                totalRevenue: 0,
                totalSell: item.productId.totalSell || 0
              };
              monthlyData[monthIndex].products.push(prod);
            }
            prod.totalCount += item.count;
            prod.totalRevenue += item.price * item.count;

            // آمار سالانه
            if (!allProductStats[pId]) {
              allProductStats[pId] = {
                product: item.productId,
                totalCount: 0,
                totalRevenue: 0,
                totalSell: item.productId.totalSell || 0
              };
            }
            allProductStats[pId].totalCount += item.count;
            allProductStats[pId].totalRevenue += item.price * item.count;
          });
        });

        // مرتب‌سازی محصولات هر ماه
        Object.values(monthlyData).forEach(month => {
          month.products.sort((a, b) => {
            if (b.totalCount === a.totalCount) {
              return b.totalSell - a.totalSell;
            }
            return b.totalCount - a.totalCount;
          });
        });

        // مرتب‌سازی محصولات کل سال
        let topProducts = Object.values(allProductStats);
        topProducts.sort((a, b) => {
          if (b.totalCount === a.totalCount) {
            return b.totalSell - a.totalSell;
          }
          return b.totalCount - a.totalCount;
        });

        // Convert to array and calculate totals
        const monthlyDataArray = Object.values(monthlyData);
        const totalRevenue = monthlyDataArray.reduce((sum, month) => sum + month.totalRevenue, 0);
        const totalOrders = monthlyDataArray.reduce((sum, month) => sum + month.totalOrders, 0);
        const totalFreeOrders = monthlyDataArray.reduce((sum, month) => sum + month.freeOrders, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const freeOrderPercentage = totalOrders > 0 ? (totalFreeOrders / totalOrders) * 100 : 0;

        return {
          monthlyData: monthlyDataArray,
          totalRevenue,
          totalOrders,
          averageOrderValue,
          freeOrderPercentage,
          topProducts
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