
const mongoose = require('mongoose'); // <-- Importa mongoose

const userSchema = new mongoose.Schema({ 
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["administrador", "cajero"], default: "cajero" }
});

module.exports = mongoose.model('User', userSchema); // <-- Exporta el modelo para usarlo


