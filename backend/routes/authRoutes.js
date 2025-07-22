const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/userController');

// Login
router.post('/login', loginUser);

// Registro
router.post('/register', registerUser);

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Error al cerrar sesión');
        res.redirect('/');
    });
});

module.exports = router;
