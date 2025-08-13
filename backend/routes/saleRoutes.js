const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const isAuthenticated = require('../middleware/isAuthenticated');
const imprimirTicketTxt = require('../utils/imprimirTicketTxt'); // Asegúrate que esté presente


// Vista protegida
router.get('/corte-caja', isAuthenticated, saleController.vistaCorteCaja);
router.get('/corte-caja/pdf', isAuthenticated, saleController.exportarPDF);
router.get('/corte-caja/excel', isAuthenticated, saleController.exportarExcel);

// 🛠️ Esta ruta fallaba porque getCorteCajaPorUsuario no estaba exportada
router.get('/corte-caja/usuario', isAuthenticated, saleController.getCorteCajaPorUsuario);

// Ventas
router.post('/', isAuthenticated, saleController.createSale);
router.post('/corte-caja/imprimir', isAuthenticated, saleController.imprimirCorteCaja);



module.exports = router;
