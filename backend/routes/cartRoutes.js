const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Middleware para inicializar carrito y tipo de precio en sesión
function initCartSession(req, res, next) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  if (!req.session.appliedPriceType) {
    req.session.appliedPriceType = 'pricePieza';
  }
  next();
}

// Calcular totales según tipo de precio aplicado
function calcularTotales(cart, appliedPriceType) {
  let subtotal = 0;
  cart.forEach(item => {
    const price = item.product[appliedPriceType] && item.product[appliedPriceType] > 0
      ? item.product[appliedPriceType]
      : item.product.pricePieza;
    subtotal += price * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// Ver carrito + formulario selección tipo precio
router.get('/view', initCartSession, (req, res) => {
  const cart = req.session.cart;
  const appliedPriceType = req.session.appliedPriceType;

  const { subtotal, tax, total } = calcularTotales(cart, appliedPriceType);

  res.render('cart/view', {
    cart,
    subtotal,
    tax,
    total,
    appliedPriceType
  });
});

// Ruta para agregar producto al carrito
router.post('/add/:id', initCartSession, async (req, res) => {
  try {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity) || 1;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Producto no encontrado');
    }

    const cart = req.session.cart;
    const index = cart.findIndex(item => item.product._id.toString() === productId);
    if (index >= 0) {
      cart[index].quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }

    req.session.cart = cart; // Actualizar sesión

    res.redirect('/cart/view');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar producto al carrito');
  }
});

// POST para actualizar tipo de precio aplicado antes de finalizar compra
router.post('/set-price-type', initCartSession, (req, res) => {
  const { tipoPrecio } = req.body;
  const allowed = ['pricePieza', 'priceMayoreo', 'pricePaquete', 'price4', 'price5'];
  if (allowed.includes(tipoPrecio)) {
    req.session.appliedPriceType = tipoPrecio;
  } else {
    req.session.appliedPriceType = 'pricePieza';
  }
  res.redirect('/cart/view');
});

// Checkout
router.post('/checkout', initCartSession, async (req, res) => {
  try {
    const cart = req.session.cart;
    const appliedPriceType = req.session.appliedPriceType;
    const { subtotal, tax, total } = calcularTotales(cart, appliedPriceType);
    const fecha = new Date().toLocaleString('es-MX');
    const ticket = {
      cart: cart.map(item => ({
        product: {
          name: item.product.name,
          priceApplied: item.product[appliedPriceType] && item.product[appliedPriceType] > 0
            ? item.product[appliedPriceType]
            : item.product.pricePieza,
        },
        quantity: item.quantity
      })),
      subtotal,
      tax,
      total,
      fecha,
      tipoPrecioAplicado: appliedPriceType
    };

    // Actualizar stock en DB
    for (const item of cart) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // Guardar ticket en sesión
    req.session.ticket = ticket;

    // Limpiar carrito y tipo precio en sesión
    req.session.cart = [];
    req.session.appliedPriceType = 'pricePieza';

    // Mostrar ticket
    res.render('cart/ticket', { ticket });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar el checkout');
  }
  // Disminuir cantidad de un producto en el carrito
router.post('/decrease/:id', initCartSession, (req, res) => {
  const productId = req.params.id;
  const cart = req.session.cart;

  const index = cart.findIndex(item => item.product._id.toString() === productId);
  if (index !== -1) {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
  }

  req.session.cart = cart;
  res.redirect('/cart/view');
});

// Eliminar completamente un producto del carrito
router.post('/remove/:id', initCartSession, (req, res) => {
  const productId = req.params.id;
  req.session.cart = req.session.cart.filter(item => item.product._id.toString() !== productId);
  res.redirect('/cart/view');
});

});

module.exports = router;
