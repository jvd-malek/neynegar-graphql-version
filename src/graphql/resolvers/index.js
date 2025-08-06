const userResolvers = require('./userResolvers');
const productResolvers = require('./productResolvers');
const orderResolvers = require('./orderResolvers');
const checkoutResolvers = require('./checkoutResolvers');
const commentResolvers = require('./commentResolvers');
const articleResolvers = require('./articleResolvers');
const authorResolvers = require('./authorResolvers');
const courseResolvers = require('./courseResolvers');
const linkResolvers = require('./linkResolvers');
const ticketResolvers = require('./ticketResolvers');
const scalarResolvers = require('./scalarResolvers');
const groupDiscountResolvers = require('./groupDiscountResolvers');
const shippingCostResolvers = require('./shippingCostResolvers');
const provinceResolvers = require('./provinceResolvers');

const resolvers = {
  ...scalarResolvers,
  Query: {
    ...userResolvers.Query,
    ...productResolvers.Query,
    ...orderResolvers.Query,
    ...checkoutResolvers.Query,
    ...commentResolvers.Query,
    ...articleResolvers.Query,
    ...authorResolvers.Query,
    ...courseResolvers.Query,
    ...linkResolvers.Query,
    ...ticketResolvers.Query,
    ...groupDiscountResolvers.Query,
    ...shippingCostResolvers.Query,
    ...provinceResolvers.Query
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...productResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...checkoutResolvers.Mutation,
    ...commentResolvers.Mutation,
    ...articleResolvers.Mutation,
    ...authorResolvers.Mutation,
    ...courseResolvers.Mutation,
    ...linkResolvers.Mutation,
    ...ticketResolvers.Mutation,
    ...groupDiscountResolvers.Mutation,
    ...shippingCostResolvers.Mutation
  }
};

module.exports = resolvers; 