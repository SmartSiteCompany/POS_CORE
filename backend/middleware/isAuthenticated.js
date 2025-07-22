function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    console.log("Usuario autenticado:", req.session.user);
    req.user = req.session.user;
    return next();
  }
  res.status(401).render("index", { error: "Inicia sesión primero" });
}

module.exports = isAuthenticated;
