const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  
  // Precios
  pricePieza: { type: Number, required: true, min: 0 },
  priceMayoreo: { type: Number, min: 0, default: 0 },
  pricePaquete: { type: Number, min: 0, default: 0 },
  price4: { type: Number, min: 0, default: 0 },
  price5: { type: Number, min: 0, default: 0 },

  // Cantidades mínimas para aplicar cada precio
  minMayoreo: { type: Number, min: 0, default: 0 },
  minPaquete: { type: Number, min: 0, default: 0 },
  min4: { type: Number, min: 0, default: 0 },
  min5: { type: Number, min: 0, default: 0 },

  category: { type: String, required: true, trim: true, default: 'uncategorized' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  barcode: { type: String, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
