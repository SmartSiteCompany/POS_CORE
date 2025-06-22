const Product = require('../models/Product');
const mongoose = require('mongoose');

// Crear un nuevo producto (con validación de categoría)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category } = req.body;
    
    // Validación básica de campos requeridos
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Nombre, precio y categoría son campos obligatorios' });
    }

    const product = new Product({
      ...req.body,
      // Fuerza minúsculas para consistencia en categorías
      category: category.toLowerCase().trim() 
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ 
      error: 'Error al crear producto',
      details: err.message 
    });
  }
};

// Obtener todos los productos (con filtros)
exports.getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, inStock } = req.query;
    const filter = {};

    // Filtros opcionales
    if (category) filter.category = category.toLowerCase();
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (inStock === 'true') filter.stock = { $gt: 0 };

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ 
      error: 'Error al obtener productos',
      details: err.message 
    });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID no válido" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ 
      error: "Error al buscar producto",
      details: err.message 
    });
  }
};

// Actualizar producto (con manejo de stock)
exports.updateProduct = async (req, res) => {
  try {
    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID no válido" });
    }

    // Si se actualiza categoría, normalizarla
    if (req.body.category) {
      req.body.category = req.body.category.toLowerCase().trim();
    }

    // Si se actualiza stock, validar que no sea negativo
    if (req.body.stock !== undefined && req.body.stock < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ 
      error: 'Error al actualizar producto',
      details: err.message 
    });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID no válido" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ 
      message: 'Producto eliminado',
      deletedProduct: product 
    });
  } catch (err) {
    res.status(500).json({ 
      error: 'Error al eliminar producto',
      details: err.message 
    });
  }
};

// Nuevo: Obtener productos por categoría
exports.getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const products = await Product.find({ category });
    
    if (products.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron productos en esta categoría',
        suggestedCategories: await Product.distinct('category') // Sugiere categorías existentes
      });
    }
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ 
      error: 'Error al buscar por categoría',
      details: err.message 
    });
  }
};