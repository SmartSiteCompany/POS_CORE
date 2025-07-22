const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { check } = require('express-validator');
const checkRole = require('../middleware/authRole');
const isAuthenticated = require('../middleware/isAuthenticated');

const productValidations = [
  check('name', 'El nombre es obligatorio (mín. 3 caracteres)')
    .not().isEmpty().isLength({ min: 3 }),
  check('pricePieza', 'El precio por pieza debe ser un número positivo')
    .isFloat({ min: 0.01 }),
  check('stock', 'El stock debe ser un número entero positivo')
    .optional().isInt({ min: 0 }),
  check('category', 'La categoría es obligatoria (mín. 3 caracteres)')
    .not().isEmpty().isLength({ min: 3 })
];

// Rutas
router.get('/new', isAuthenticated, checkRole('administrador'), productController.renderNewForm);
router.post('/', isAuthenticated, checkRole('administrador'), productValidations, productController.createProduct);

router.get('/edit/:id', isAuthenticated, checkRole('administrador'), productController.renderEditForm);
router.post('/edit/:id', isAuthenticated, checkRole('administrador'), productValidations, productController.updateProduct);

router.post('/delete/:id', isAuthenticated, checkRole('administrador'), check('id', 'ID no válido').isMongoId(), productController.deleteProduct);

router.get('/', isAuthenticated, productController.getProducts);

module.exports = router;
