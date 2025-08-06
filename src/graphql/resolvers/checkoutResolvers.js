const Checkout = require('../../models/Checkout');
const Order = require('../../models/Order');
const ShippingCost = require('../../models/ShippingCost');
const userModel = require('../../models/User');
const { createpayment, verifypayment } = require('../../middleware/zarinpal');

const checkoutResolvers = {
  Query: {
    checkouts: async () => {
      return await Checkout.find();
    },
    checkout: async (_, { id }) => {
      return await Checkout.findById(id);
    },
    checkoutsByUser: async (_, { userId }) => {
      return await Checkout.find({ userId });
    }
  },

  Mutation: {
    createCheckout: async (_, { input }) => {
      const checkout = new Checkout({
        ...input,
        // expiredAt: moment().add(1, 'hour').format('YYYY/MM/DD HH:mm:ss')
      });
      return await checkout.save();
    },

    updateCheckout: async (_, { id, input }) => {
      return await Checkout.findByIdAndUpdate(id, input, { new: true });
    },

    deleteCheckout: async (_, { id }) => {
      const result = await Checkout.findByIdAndDelete(id);
      return !!result;
    },

    convertCheckoutToOrder: async (_, { checkoutId }) => {
      const checkout = await Checkout.findById(checkoutId);
      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Create order from checkout
      const order = new Order({
        products: checkout.products.map(product => ({
          productId: product.productId,
          price: 0, // You need to get the current price from the product
          discount: 0, // You need to get the current discount from the product
          count: product.count
        })),
        submition: checkout.submition,
        totalPrice: checkout.totalPrice,
        totalWeight: checkout.totalWeight,
        discount: checkout.discount,
        status: 'در انتظار پرداخت',
        authority: checkout.authority,
        userId: checkout.userId
      });

      const savedOrder = await order.save();

      // Delete the checkout
      await Checkout.findByIdAndDelete(checkoutId);

      return savedOrder;
    },

    createCheckoutPayment: async (_, { shipment, discount }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const User = await userModel.findById(user._id)
          .populate("bascket.productId");

        // کاربر از auth middleware با bascket.productId populate شده است
        const populatedUser = User;

        let subtotal = 0;
        let totalDiscount = 0;
        let total = 0;
        let totalWeight = 0;

        const isDiscountValid = (discount) => {
          if (!discount || !discount.date) return false;
          const now = Date.now();
          const discountDate = discount.date;
          return now <= discountDate;
        };

        const enrichedBasket = populatedUser.bascket
          .filter(item => item.productId)
          .map(item => {
            const product = item.productId;
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
              productId: product._id,
              currentPrice,
              currentDiscount,
              itemTotal,
              itemDiscount: itemDiscountAmount * item.count,
              itemWeight
            };
          });

        // محاسبه هزینه ارسال
        const shippingType = 'پست';

        const shippingCostDoc = await ShippingCost.findOne({ type: shippingType });
        let shippingCost = 0;
        if (shippingCostDoc) {
          shippingCost = shippingCostDoc.cost + (shippingCostDoc.costPerKg * totalWeight / 1000);
        } else {
          shippingCost = (totalWeight * 10) + 90000;
        }

        const grandTotal = total + shippingCost;
        const amountInRial = ((shipment === "پست" ? grandTotal : total) - discount) * 10;

        // ایجاد پرداخت
        const payment = await createpayment({
          amountInRial,
          mobile: populatedUser.phone,
          desc: `سفارش با شناسه ${populatedUser._id}`
        });

        // ایجاد checkout
        const checkout = await Checkout.create({
          products: populatedUser.bascket,
          submition: shipment,
          totalPrice: amountInRial,
          totalWeight: totalWeight,
          discount: totalDiscount,
          userId: populatedUser._id,
          authority: payment.authority
        });

        // ایجاد order
        const validOrderProducts = enrichedBasket.map((p) => ({
          count: p.count,
          productId: p.productId,
          price: p.currentPrice,
          discount: p.currentDiscount
        }));

        await Order.create({
          userId: populatedUser._id,
          products: validOrderProducts,
          submition: checkout.submition,
          totalPrice: checkout.totalPrice,
          totalWeight: checkout.totalWeight,
          discount: checkout.discount,
          authority: checkout.authority,
        });

        // Delete the checkout
        await Checkout.findByIdAndDelete(checkout._id);

        return {
          authority: payment.authority,
          paymentURL: payment.paymentURL,
          success: true,
          message: "پرداخت با موفقیت ایجاد شد"
        };

      } catch (error) {
        console.error('Error in createCheckoutPayment:', error);
        throw new Error("خطا در ایجاد پرداخت");
      }
    }
  }
};

module.exports = checkoutResolvers; 