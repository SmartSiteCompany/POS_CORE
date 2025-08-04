console.log("✅ Middleware isAuthenticated.js cargado correctamente");

const User = require('../models/User');

async function isAuthenticated(req, res, next) {
  console.log("🟡 Ejecutando isAuthenticated middleware");
  console.log("➡️ session.userId:", req.session?.userId);

  if (req.session && req.session.userId) {
    try {
      if (!req.user) {
        const user = await User.findById(req.session.userId);
        if (!user) {
          return res.status(401).render("index", { error: "Usuario no encontrado" });
        }
        req.user = user;
      }
      return next();
    } catch (err) {
      console.error("❌ Error autenticando:", err);
      return res.status(500).render("index", { error: "Error de autenticación" });
    }
  } else {
    console.warn("⚠️ No autenticado: No hay sesión");
    return res.status(401).render("index", { error: "Inicia sesión primero" });
  }
}

module.exports = isAuthenticated;
