const Product = require('../models/Product');
const { validationResult } = require('express-validator');

function parsePrice(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }
  return value || 0;
}

// Utilidad para escapar términos en RegExp
function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.renderNewForm = (req, res) => {
  res.render('products/new', { errors: [], user: req.user, formData: {} });
};

exports.createProduct = async (req, res) => {
  const errors = validationResult(req);

  const stockMin = parseInt(req.body.stockMin || 0);
  const stockMax = parseInt(req.body.stockMax || 0);

  if (stockMin >= stockMax) {
    return res.status(400).render('products/new', {
      errors: [{ param: 'stockMin', msg: 'El inventario mínimo debe ser menor que el máximo' }],
      user: req.user,
      formData: req.body
    });
  }

  if (!errors.isEmpty()) {
    return res.status(400).render('products/new', {
      errors: errors.array(),
      user: req.user,
      formData: req.body
    });
  }

  try {
    const product = new Product({
      name: req.body.name,
      category: req.body.category,
      pricePieza: parsePrice(req.body.pricePieza),
      priceMayoreo: parsePrice(req.body.priceMayoreo),
      pricePaquete: parsePrice(req.body.pricePaquete),
      price4: parsePrice(req.body.price4),
      price5: parsePrice(req.body.price5),
      minMayoreo: parseInt(req.body.minMayoreo || 0),
      minPaquete: parseInt(req.body.minPaquete || 0),
      min4: parseInt(req.body.min4 || 0),
      min5: parseInt(req.body.min5 || 0),
      stock: parseInt(req.body.stock || 0),
      stockMin,
      stockMax,
      barcode: req.body.barcode,
      description: req.body.description,
      image: req.file ? req.file.filename : ''
    });

    await product.save();
    res.redirect('/products');
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).render('products/new', {
      errors: [{ msg: 'Error interno al guardar el producto' }],
      user: req.user,
      formData: req.body
    });
  }
};

exports.editProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.redirect('/products');

    res.render('products/edit', {
      product,
      errors: [],
      user: req.user
    });
  } catch (error) {
    console.error('Error al obtener producto para editar:', error);
    res.redirect('/products');
  }
};

exports.updateProduct = async (req, res) => {
  const errors = validationResult(req);

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.redirect('/products');

    const stockMin = parseInt(req.body.stockMin || 0);
    const stockMax = parseInt(req.body.stockMax || 0);

    if (stockMin >= stockMax) {
      return res.render('products/edit', {
        product,
        errors: [{ param: 'stockMin', msg: 'El inventario mínimo debe ser menor que el máximo' }],
        user: req.user
      });
    }

    if (!errors.isEmpty()) {
      return res.render('products/edit', {
        product,
        errors: errors.array(),
        user: req.user
      });
    }

    product.name = req.body.name;
    product.category = req.body.category;
    product.pricePieza = parsePrice(req.body.pricePieza);
    product.priceMayoreo = parsePrice(req.body.priceMayoreo);
    product.pricePaquete = parsePrice(req.body.pricePaquete);
    product.price4 = parsePrice(req.body.price4);
    product.price5 = parsePrice(req.body.price5);
    product.minMayoreo = parseInt(req.body.minMayoreo || 0);
    product.minPaquete = parseInt(req.body.minPaquete || 0);
    product.min4 = parseInt(req.body.min4 || 0);
    product.min5 = parseInt(req.body.min5 || 0);
    product.stock = parseInt(req.body.stock || 0);
    product.stockMin = stockMin;
    product.stockMax = stockMax;
    product.barcode = req.body.barcode;
    product.description = req.body.description;

    if (req.file) {
      product.image = req.file.filename;
    }

    await product.save();
    res.redirect('/products');

  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.redirect('/products');
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.redirect('/products');
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { category, minStock, search, page = 1, importSuccess, importError } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (minStock) filters.stock = { $gte: parseInt(minStock) };
    if (search) filters.name = { $regex: search, $options: 'i' };

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    const [products, total, categoriesRaw] = await Promise.all([
      Product.find(filters)
        .collation({ locale: 'es', strength: 1, numericOrdering: true })
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filters),
      Product.distinct('category')
    ]);

    const categories = (categoriesRaw || []).sort((a, b) =>
      String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' })
    );

    const totalPages = Math.ceil(total / limit);

    let successMessage = null;
    let errorMessage = null;
    if (importSuccess === '1') successMessage = 'Productos importados correctamente.';
    if (importError === '1') errorMessage = 'Error al importar productos.';

    res.render('products/list', {
      products,
      categories,
      currentCategory: category || '',
      minStock: minStock || '',
      searchQuery: search || '',
      user: req.user || null,
      currentPage: parseInt(page),
      totalPages,
      successMessage,
      errorMessage
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).send('Error al cargar productos');
  }
};

// ---------- SUGERENCIAS (autocomplete) ----------
exports.suggestProducts = async (req, res) => {
  try {
    const qRaw = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const minStock = parseInt(req.query.minStock || '');
    const limit = Math.min(parseInt(req.query.limit || '8', 10) || 8, 20);

    if (qRaw.length < 2) return res.json([]); // mínimo 2 letras

    const esc = escapeRegExp(qRaw);

    const filter = {
      $or: [
        { name: { $regex: esc, $options: 'i' } },
        { barcode: { $regex: esc, $options: 'i' } },
        { description: { $regex: esc, $options: 'i' } }
      ]
    };
    if (category) filter.category = category;
    if (!Number.isNaN(minStock)) filter.stock = { $gte: minStock };

    const rows = await Product.find(filter)
      .select('name barcode pricePieza image stock category')
      .collation({ locale: 'es', strength: 1, numericOrdering: true })
      .sort({ name: 1, _id: 1 })
      .limit(limit)
      .lean();

    const suggestions = rows.map(p => ({
      id: p._id,
      name: p.name,
      barcode: p.barcode,
      price: p.pricePieza,
      stock: p.stock,
      image: p.image,
      category: p.category
    }));

    res.json(suggestions);
  } catch (e) {
    console.error('❌ Error en /products/suggest:', e);
    res.status(500).json([]);
  }
};
