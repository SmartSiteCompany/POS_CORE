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

// 🔡 Collation por defecto para TODAS las consultas de este modelo
productSchema.set('collation', { locale: 'es', strength: 1, numericOrdering: true });

// Índices recomendados para ordenar/buscar más rápido con collation
productSchema.index({ name: 1 }, { collation: { locale: 'es', strength: 1, numericOrdering: true } });
productSchema.index({ category: 1 }, { collation: { locale: 'es', strength: 1 } });

module.exports = mongoose.model('Product', productSchema);
