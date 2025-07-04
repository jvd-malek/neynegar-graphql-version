const userResolvers = require('./userResolvers');
const productResolvers = require('./productResolvers');
const orderResolvers = require('./orderResolvers');
const checkoutResolvers = require('./checkoutResolvers');
const commentResolvers = require('./commentResolvers');
const articleResolvers = require('./articleResolvers');
const authorResolvers = require('./authorResolvers');
const codeResolvers = require('./codeResolvers');
const linkResolvers = require('./linkResolvers');
const ticketResolvers = require('./ticketResolvers');
const scalarResolvers = require('./scalarResolvers');

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
    ...codeResolvers.Query,
    ...linkResolvers.Query,
    ...ticketResolvers.Query
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...productResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...checkoutResolvers.Mutation,
    ...commentResolvers.Mutation,
    ...articleResolvers.Mutation,
    ...authorResolvers.Mutation,
    ...codeResolvers.Mutation,
    ...linkResolvers.Mutation,
    ...ticketResolvers.Mutation
  }
};

module.exports = resolvers; 