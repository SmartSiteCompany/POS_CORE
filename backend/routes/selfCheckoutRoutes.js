const express = require('express');
const router = express.Router();
const c = require('../controllers/selfCheckoutController');

// Productos (filtros + paginación)
router.get('/products', c.mostrarProductos);

// Autocomplete (sugerencias)
router.get('/suggest', c.sugerirProductos);

// Carrito
router.get('/cart', c.verCarrito);
router.post('/cart/add', c.agregarAlCarrito);
router.get('/cart/count', c.contarCarrito);
router.post('/cart/increase/:id', c.aumentarCantidad);
router.post('/cart/decrease/:id', c.disminuirCantidad);
router.post('/remove-from-cart/:id', c.eliminarDelCarrito);

// Pago
router.get('/payment', c.renderPago);
router.post('/payment', c.procesarPago);
router.get('/success', c.mostrarExito);
router.get('/qr-ticket', c.generarQR);

module.exports = router;
