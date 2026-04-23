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
const packageResolvers = require('./packageResolvers');

const modules = [
  userResolvers,
  productResolvers,
  orderResolvers,
  checkoutResolvers,
  commentResolvers,
  articleResolvers,
  authorResolvers,
  courseResolvers,
  linkResolvers,
  ticketResolvers,
  groupDiscountResolvers,
  shippingCostResolvers,
  provinceResolvers,
  packageResolvers,
];

const resolvers = {
  ...scalarResolvers,
  Query: Object.assign({}, ...modules.map(r => r.Query)),
  Mutation: Object.assign({}, ...modules.map(r => r.Mutation)),
};

module.exports = resolvers;
