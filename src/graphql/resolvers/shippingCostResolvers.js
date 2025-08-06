const ShippingCost = require('../../models/ShippingCost');

const shippingCostResolvers = {
  Query: {
    shippingCosts: async () => {
      return await ShippingCost.find();
    },
    shippingCost: async (_, { id }) => {
      return await ShippingCost.findById(id);
    },
    shippingCostByType: async (_, { type }) => {
      return await ShippingCost.findOne({ type });
    }
  },
  Mutation: {
    createShippingCost: async (_, { input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      const shippingCost = new ShippingCost(input);
      return await shippingCost.save();
    },
    updateShippingCost: async (_, { id, input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      return await ShippingCost.findByIdAndUpdate(id, input, { new: true });
    },
    deleteShippingCost: async (_, { id }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      const result = await ShippingCost.findByIdAndDelete(id);
      return !!result;
    }
  }
};

module.exports = shippingCostResolvers; 