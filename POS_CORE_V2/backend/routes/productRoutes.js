const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');

const { check } = require('express-validator');

const productController = require('../controllers/productController');
const excelController = require('../controllers/excelController');

const checkRole = require('../middleware/authRole');
const isAuthenticated = require('../middleware/isAuthenticated');

// Validaciones
const productValidations = [
  check('name', 'El nombre es obligatorio (mín. 3 caracteres)')
    .not().isEmpty().isLength({ min: 3 }),
  check('pricePieza', 'El precio por pieza debe ser un número positivo')
    .isFloat({ min: 0.01 }),
  check('stock', 'El stock debe ser un número entero positivo')
    .optional().isInt({ min: 0 }),
  check('category', 'La categoría es obligatoria (mín. 3 caracteres)')
    .not().isEmpty().isLength({ min: 3 }),
  check('barcode', 'El código de barras es obligatorio')
    .not().isEmpty().trim().isLength({ min: 1 })
];



// Rutas de productos
router.get('/new', isAuthenticated, checkRole('administrador'), productController.renderNewForm);

router.post('/', isAuthenticated, checkRole('administrador'), upload.single('image'), productValidations, productController.createProduct);


router.get('/edit/:id', isAuthenticated, checkRole('administrador'), productController.editProduct);

router.post('/edit/:id', isAuthenticated, checkRole('administrador'), upload.single('image'), productValidations, productController.updateProduct);


router.post('/delete/:id',
  isAuthenticated,
  checkRole('administrador'),
  check('id', 'ID no válido').isMongoId(),
  productController.deleteProduct
);

router.get('/', isAuthenticated, productController.getProducts);

// Rutas para importar y exportar Excel
router.post('/import', isAuthenticated, checkRole('administrador'), upload.single('excelFile'), excelController.importExcel);
router.get('/export', isAuthenticated, checkRole('administrador'), excelController.exportExcel);

module.exports = router;
