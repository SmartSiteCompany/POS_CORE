const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { check } = require('express-validator');

// Validaciones reutilizables
const productValidations = [
  check('name', 'El nombre es obligatorio (mín. 3 caracteres)')
    .not().isEmpty()
    .isLength({ min: 3 }),
  check('price', 'El precio debe ser un número positivo')
    .isFloat({ min: 0.01 }),
  check('stock', 'El stock debe ser un número entero positivo')
    .optional()
    .isInt({ min: 0 }),
  check('category', 'La categoría es obligatoria (mín. 3 caracteres)')
    .not().isEmpty()
    .isLength({ min: 3 })
];

// Rutas CRUD con validaciones
router.post('/', productValidations, productController.createProduct);
router.put('/:id', productValidations, productController.updateProduct);

// Nueva ruta para filtro por categoría
router.get('/category/:category', productController.getProductsByCategory);

// Rutas existentes con mejor manejo de IDs
router.get('/', productController.getProducts);
router.get('/:id', 
  check('id', 'ID no válido').isMongoId(),
  productController.getProductById
);
router.delete('/:id', 
  check('id', 'ID no válido').isMongoId(),
  productController.deleteProduct
);
// Nueva ruta para renderizar la vista `list.ejs`
router.get('/view', (req, res) => {
    res.render('products/list'); // ✅ Renderiza la vista correctamente
});



module.exports = router;