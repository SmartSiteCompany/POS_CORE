const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// EJS Config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const productRoutes = require('./src/routes/productRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);

// Frontend Routes
const Product = require('./src/models/Product');

// Helpers para validación
const validateProduct = [
  check('name', 'Nombre requerido (mín. 3 caracteres)').isLength({ min: 3 }),
  check('price', 'Precio debe ser positivo').isFloat({ min: 0.01 }),
  check('stock', 'Stock debe ser entero positivo').optional().isInt({ min: 0 }),
  check('category', 'Categoría requerida').not().isEmpty()
];

// Home
app.get('/', (req, res) => {
  res.render('index');
});

// Lista de productos (con filtros)
app.get('/products', async (req, res) => {
  try {
    const { category, minStock, search } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (minStock) filter.stock = { $gte: Number(minStock) };
    if (search) {
      filter.name = { $regex: search, $options: 'i' }; // Búsqueda insensible a mayúsculas
    }

    const products = await Product.find(filter);
    const categories = await Product.distinct('category');
    
    res.render('products/list', { 
      products,
      categories,
      currentCategory: category || '',
      minStock: minStock || '',
      searchQuery: search || '', // Pasamos el término de búsqueda a la vista
      errors: null
    });
  } catch (err) {
    res.render('error', { error: err.message });
  }
});

// Nuevo producto (formulario)
app.get('/products/new', (req, res) => {
  res.render('products/new', { 
    product: new Product(),
    errors: null
  });
});

// Crear producto (POST)
app.post('/products', validateProduct, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('products/new', {
      product: req.body,
      errors: errors.array()
    });
  }

  try {
    const { name, price, description, stock, category, barcode } = req.body;
    await Product.create({ 
      name, 
      price, 
      description, 
      stock: stock || 0,
      category: category.toLowerCase(),
      barcode 
    });
    res.redirect('/products');
  } catch (err) {
    res.render('products/new', {
      product: req.body,
      errors: [{ msg: 'Error al crear producto: ' + err.message }]
    });
  }
});

// Editar producto (formulario)
app.get('/products/edit/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/products');
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.redirect('/products');
    }
    
    res.render('products/edit', { 
      product,
      errors: null
    });
  } catch (err) {
    res.redirect('/products');
  }
});

// Actualizar producto (POST)
app.post('/products/edit/:id', validateProduct, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('products/edit', { 
      product: req.body,
      errors: errors.array() 
    });
  }

  try {
    const { name, price, description, stock, category } = req.body;
    await Product.findByIdAndUpdate(req.params.id, { 
      name, 
      price, 
      description,
      stock,
      category: category.toLowerCase()
    });
    res.redirect('/products');
  } catch (err) {
    res.render('products/edit', { 
      product: req.body,
      errors: [{ msg: 'Error al actualizar: ' + err.message }]
    });
  }
});

// Eliminar producto
app.post('/products/delete/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/products');
    }
    
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } catch (err) {
    res.redirect('/products');
  }
});

module.exports = app;