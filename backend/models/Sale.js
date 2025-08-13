const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtSale: {
    type: Number,
    required: true,
    min: 0
  }
});

const saleSchema = new mongoose.Schema({
  items: [saleItemSchema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'mixto'],
    required: function () {
      return this.status === 'finalizado';
    }
  },
  pagoEfectivo: { type: Number, default: 0 },
  pagoTarjeta: { type: Number, default: 0 },
  pagoTransferencia: { type: Number, default: 0 },
  cambio: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pendiente', 'finalizado'],
    default: 'finalizado'
  }
});

module.exports = mongoose.model('Sale', saleSchema);
