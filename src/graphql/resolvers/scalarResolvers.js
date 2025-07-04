const { GraphQLScalarType } = require('graphql');

const scalarResolvers = {
  FormData: new GraphQLScalarType({
    name: 'FormData',
    description: 'FormData scalar type',
    parseValue(value) {
      return value; // value from the client
    },
    serialize(value) {
      return value; // value sent to the client
    },
    parseLiteral(ast) {
      return ast.value; // value from the client query
    },
  }),
};

module.exports = scalarResolvers; 