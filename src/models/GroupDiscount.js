const mongoose = require('mongoose');

const groupDiscountSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 120
  },
  majorCat: {
    type: String,
    required: true,
    trim: true
  },
  minorCat: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  discount: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  startDate: {
    type: Number, // timestamp
    default: () => Date.now()
  },
  endDate: {
    type: Number, // timestamp
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GroupDiscount', groupDiscountSchema); 