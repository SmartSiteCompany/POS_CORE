const express = require('express');
const router = express.Router();
const selfCheckoutController = require('../controllers/selfCheckoutController');

// Mostrar productos
router.get('/cart', selfCheckoutController.verCarrito);
router.post('/cart/add', selfCheckoutController.agregarAlCarrito);
router.get('/products', selfCheckoutController.mostrarProductos);
router.get('/payment', selfCheckoutController.renderPago);
router.post('/payment', selfCheckoutController.procesarPago);
router.get('/success', selfCheckoutController.mostrarExito);
router.get('/qr-ticket', selfCheckoutController.generarQR);

module.exports = router;
