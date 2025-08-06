const Province = require('../../models/Province');

const provinceResolvers = {
  Query: {
    provinces: async () => {
      return await Province.find();
    },
  },
};

module.exports = provinceResolvers; 