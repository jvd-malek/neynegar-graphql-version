const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { verifypayment } = require('../../middleware/zarinpal');

const orderResolvers = {
  Query: {
    orders: async (_, { page = 1, limit = 10, search = '' }, { user }) => {
      console.log('Orders resolver - User:', user ? {
        id: user._id,
        status: user.status,
        name: user.name
      } : 'No user');
      
      if (!user) {
        console.log('Access denied: No user');
        throw new Error("Unauthorized");
      }
      
      if (user.status !== "admin" && user.status !== "owner") {
        console.log('Access denied: Invalid user status:', user.status);
        throw new Error("Unauthorized");
      }

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
        });
    },
    ordersByUser: async (_, { userId, page = 1, limit = 10 }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      
      const skip = (page - 1) * limit;
      const [orders, total] = await Promise.all([
        Order.find({ userId })
          .populate({
            path: 'userId',
            select: '_id name phone email address postCode'
          })
          .populate({
            path: 'products.productId',
            select: '_id title cover brand status'
          })
          .skip(skip)
          .limit(limit)
          .sort({ _id: -1 }),
        Order.countDocuments({ userId })
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
        });
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
        await Product.findByIdAndUpdate(product.productId, {
          $inc: {
            totalSell: product.count,
            showCount: -product.count
          }
        });
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
      if (order.status !== "پرداخت نشده") {
        return order;
      }
      const verifyRes = await verifypayment({
        amountInRial: order.totalPrice,
        authority: order.authority
      });
      if (verifyRes && verifyRes.data && verifyRes.data.code === 100) {
        order.status = "در انتظار تایید";
        order.paymentId = verifyRes.data.ref_id;
        await order.save();

        // --- حذف محصولات سفارش از سبد خرید کاربر و کاهش تعداد محصولات ---
        const userObj = await User.findById(order.userId);
        if (userObj) {
          // حذف محصولات سفارش از سبد خرید
          order.products.forEach(item => {
            userObj.bascket = userObj.bascket.filter(b => b.productId.toString() !== item.productId.toString());
          });
          // افزایش totalBuy کاربر
          userObj.totalBuy += order.totalPrice;
          await userObj.save();
        }
        // کاهش تعداد showCount و count محصولات و افزایش totalSell (بر اساس مبلغ ذخیره‌شده در سفارش)
        for (const item of order.products) {
          const finalPrice = (item.price - (item.price * (item.discount / 100))) * item.count;
          await Product.findByIdAndUpdate(item.productId, {
            $inc: {
              showCount: -item.count,
              count: -item.count,
              totalSell: finalPrice
            }
          });
        }
        // --- پایان ---

        return order;
      } else {
        throw new Error("پرداخت تایید نشد");
      }
    }
  }
};

module.exports = orderResolvers; 