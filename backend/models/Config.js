const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ticketName: { type: String, required: true },
  taxRate: { type: Number, required: true }, // porcentaje de impuesto, por ejemplo: 16
}, {
  timestamps: true
});

module.exports = mongoose.model('Config', configSchema);
