const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  barcode: {
    type: String,
    unique: true,
    trim: true
  },
  category: {  // Nuevo campo (podría ser String o referencia a otro modelo)
    type: String,
    required: true,
    trim: true,
    default: 'uncategorized'  // Opcional: valor por defecto
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);