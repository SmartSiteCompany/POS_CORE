const Product = require('../models/Product');
const { validationResult } = require('express-validator');

exports.getProducts = async (req, res) => {
  try {
    const { category, minStock, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (minStock) filter.stock = { $gte: parseInt(minStock) };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter);
    const categories = await Product.distinct('category');

    res.render('products/list', {
      products,
      categories,
      currentCategory: category || '',
      minStock,
      searchQuery: search || '',
      user: req.user
    });
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
};


exports.renderNewForm = async (req, res) => {
  const categories = await Product.distinct('category');
  res.render('products/new', {
    formData: {},
    errors: [],
    user: req.user,
    categories
  });
};

exports.renderEditForm = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Paso 1: ID recibida ->", id);

    const product = await Product.findById(id);
    console.log("Paso 2: Producto encontrado ->", product ? product.name : 'No encontrado');

    if (!product) {
      console.log("Producto no encontrado");
      return res.status(404).send('Producto no encontrado');
    }

    // Aquí solo mandamos texto simple para prueba
    console.log("Paso 3: Enviando respuesta simple");
    res.send(`<h1>Editar producto: ${product.name}</h1>`);
  } catch (err) {
    console.error("Error catch:", err);
    res.status(500).send('Error al cargar producto para edición');
  }
};




exports.updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const product = await Product.findById(req.params.id);
    const categories = await Product.distinct('category');

    return res.status(400).render('products/edit', {
      product,
      categories,
      user: req.user,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      pricePieza,
      priceMayoreo,
      pricePaquete,
      price4,
      price5,
      minMayoreo,
      minPaquete,
      min4,
      min5,
      category,
      stock,
      barcode,
      description,
    } = req.body;

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      pricePieza: pricePieza || 0,
      priceMayoreo: priceMayoreo || 0,
      pricePaquete: pricePaquete || 0,
      price4: price4 || 0,
      price5: price5 || 0,
      minMayoreo: minMayoreo || 0,
      minPaquete: minPaquete || 0,
      min4: min4 || 0,
      min5: min5 || 0,
      category,
      stock: stock || 0,
      barcode,
      description
    });

    res.redirect('/products');
  } catch (err) {
    res.status(500).send('Error al actualizar el producto');
  }
};

exports.createProduct = async (req, res) => {
  const errors = validationResult(req);
  const categories = await Product.distinct('category');
  if (!errors.isEmpty()) {
    return res.status(400).render('products/new', {
      errors: errors.array(),
      user: req.user,
      categories,
      formData: req.body,
    });
  }

  try {
    const {
      name,
      pricePieza,
      priceMayoreo,
      pricePaquete,
      price4,
      price5,
      minMayoreo,
      minPaquete,
      min4,
      min5,
      category,
      stock,
      barcode,
      description,
    } = req.body;

    const newProduct = new Product({
      name,
      pricePieza: pricePieza || 0,
      priceMayoreo: priceMayoreo || 0,
      pricePaquete: pricePaquete || 0,
      price4: price4 || 0,
      price5: price5 || 0,
      minMayoreo: minMayoreo || 0,
      minPaquete: minPaquete || 0,
      min4: min4 || 0,
      min5: min5 || 0,
      category,
      stock: stock || 0,
      barcode,
      description,
    });

    await newProduct.save();
    res.redirect('/products');
  } catch (err) {
    console.error("Error al crear producto:", err);
    res.status(500).send('Error al crear el producto');
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } catch (err) {
    res.status(500).send('Error al eliminar producto');
  }
};
