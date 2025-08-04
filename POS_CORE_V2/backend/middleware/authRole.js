function checkRole(role) {
  return (req, res, next) => {
    console.log("🔐 Ejecutando checkRole middleware");
    console.log("👤 Usuario cargado:", req.user);
    console.log("🎯 Rol requerido:", role);

    if (!req.user || req.user.role !== role) {
      console.warn("🚫 Rol incorrecto o usuario no autenticado");
      return res.status(403).render("partials/403");
    }

    next();
  };
}

module.exports = checkRole;
