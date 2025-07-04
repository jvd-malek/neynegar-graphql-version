const { gql } = require('graphql-tag');
const types = require('./types');
const queries = require('./queries');
const mutations = require('./mutations');

const typeDefs = gql`
  ${types}
  ${queries}
  ${mutations}
`;

module.exports = typeDefs; 