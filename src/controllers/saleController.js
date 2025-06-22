const Sale = require('../models/Sale');
const Product = require('../models/Product');

exports.createSale = async (req, res) => {
  try {
    // Validación inicial
    if (!req.body.items || !Array.isArray(req.body.items)) {
      return res.status(400).json({ 
        error: "Se requiere un array 'items' válido" 
      });
    }

    if (!req.body.paymentMethod) {
      return res.status(400).json({ 
        error: "Se requiere 'paymentMethod'" 
      });
    }

    // Verificar items
    let total = 0;
    const items = [];
    
    for (const item of req.body.items) {
      // Validar estructura de cada item
      if (!item.product || !item.quantity) {
        return res.status(400).json({ 
          error: "Cada item debe tener 'product' y 'quantity'" 
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ 
          error: `Producto ${item.product} no encontrado` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${product.name}` 
        });
      }
      
      items.push({
        product: item.product,
        quantity: item.quantity,
        priceAtSale: product.price
      });
      
      total += product.price * item.quantity;
    }
    
    // Actualizar stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Crear venta
    const sale = new Sale({
      items,
      total,
      paymentMethod: req.body.paymentMethod
    });
    
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ 
      error: "Error al crear venta",
      details: err.message 
    });
  }
};

// Obtener todas las ventas
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find().populate('items.product');
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener una venta por ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('items.product');
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};