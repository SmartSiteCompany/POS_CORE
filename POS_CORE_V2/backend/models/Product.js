const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  pricePieza: { type: Number, required: true },
  priceMayoreo: { type: Number, default: 0 },
  pricePaquete: { type: Number, default: 0 },
  price4: { type: Number, default: 0 },
  price5: { type: Number, default: 0 },
  minMayoreo: { type: Number, default: 0, min: 0 },
  minPaquete: { type: Number, default: 0, min: 0 },
  min4: { type: Number, default: 0, min: 0 },
  min5: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0 },
  stockMin: { type: Number, default: 0 },
  stockMax: { type: Number, default: 0 },
  barcode: { type: String, required: true },
  description: { type: String },
  image: { type: String }
});

module.exports = mongoose.model('Product', productSchema);
