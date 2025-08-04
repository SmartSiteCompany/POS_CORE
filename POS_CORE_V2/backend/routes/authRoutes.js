const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/userController');

// Middleware para parsear body (por si no está en server.js, aunque es mejor tenerlo ahí globalmente)
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// Ruta para iniciar sesión
router.post('/login', loginUser);

// Ruta para registrar usuario
router.post('/register', registerUser);

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
