const mongoose = require('mongoose');

const ProvinceSchema = new mongoose.Schema({
  province: {
    type: String,
    required: true,
  },
  cities: [
    {
      type: String,
      required: true,
    },
  ],
});

module.exports = mongoose.model('Province', ProvinceSchema); 