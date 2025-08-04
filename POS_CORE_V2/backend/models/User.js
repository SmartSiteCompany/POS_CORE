const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['administrador', 'cajero'], default: 'cajero' },
  montoInicial: { type: Number, default: 0 },
  image: { type: String } // ✅ campo para imagen
});

module.exports = mongoose.model('User', userSchema);
