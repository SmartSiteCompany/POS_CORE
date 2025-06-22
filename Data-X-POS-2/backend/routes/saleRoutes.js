const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// CRUD para ventas
router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);

module.exports = router;