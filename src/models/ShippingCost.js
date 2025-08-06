const mongoose = require('mongoose');

const ShippingCostSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    required: true
  },
  costPerKg: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true // این گزینه createdAt و updatedAt را اضافه می‌کند
});

module.exports = mongoose.model('ShippingCost', ShippingCostSchema); 