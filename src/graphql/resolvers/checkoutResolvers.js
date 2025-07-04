const Checkout = require('../../models/Checkout');
const Order = require('../../models/Order');

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
    }
  }
};

module.exports = checkoutResolvers; 