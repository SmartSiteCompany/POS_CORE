const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const cartController = require('../controllers/cartController');
const isAuthenticated = require('../middleware/isAuthenticated');
const imprimirTicket = require('../utils/imprimirTicket');

// 🟢 Middleware para inicializar carrito y tipo de precio en sesión
function initCartSession(req, res, next) {
  if (!req.session.cart) req.session.cart = [];
  if (!req.session.appliedPriceType) req.session.appliedPriceType = 'pricePieza';
  next();
}

// 🧮 Calcular totales
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

// 🛒 Ver carrito
router.get('/view', initCartSession, (req, res) => {
  const cart = req.session.cart;
  const appliedPriceType = req.session.appliedPriceType;
  const { subtotal, tax, total } = calcularTotales(cart, appliedPriceType);
  req.session.cartTotal = total;

  res.render('cart/view', { cart, subtotal, tax, total, appliedPriceType });
});

// 🟢 Agregar producto al carrito
router.post('/add/:id', isAuthenticated, initCartSession, async (req, res) => {
  try {
    console.log("👉 Agregando producto al carrito. Usuario:", req.user?.name, "-", req.user?.role);

    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity) || 1;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Producto no encontrado');

    const cart = req.session.cart;
    const index = cart.findIndex(item => item.product._id.toString() === productId);

    if (index >= 0) {
      cart[index].quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }

    req.session.cart = cart;
    res.redirect('/cart/view');
  } catch (err) {
    console.error("❌ Error al agregar producto:", err);
    res.status(500).send('Error al agregar producto al carrito');
  }
});

// 🔄 Cambiar tipo de precio
router.post('/set-price-type', initCartSession, (req, res) => {
  const { tipoPrecio } = req.body;
  const allowed = ['pricePieza', 'priceMayoreo', 'pricePaquete', 'price4', 'price5'];
  req.session.appliedPriceType = allowed.includes(tipoPrecio) ? tipoPrecio : 'pricePieza';
  res.redirect('/cart/view');
});

// 💳 Seleccionar tipo de pago
router.post('/seleccionar-pago', initCartSession, isAuthenticated, (req, res) => {
  const tipoPago = req.body.tipoPago;

  if (!tipoPago || !['efectivo', 'tarjeta', 'transferencia', 'mixto'].includes(tipoPago)) {
    return res.status(400).send('Tipo de pago inválido');
  }

  req.session.tipoPago = tipoPago;

  if (tipoPago === 'mixto') {
    return res.render('cart/payment-mixto', { total: req.session.cartTotal });
  }

  res.render('cart/payment', {
    method: tipoPago,
    total: req.session.cartTotal
  });
});

// 💰 Procesar compra
router.post('/checkout', isAuthenticated, initCartSession, async (req, res) => {
  await cartController.processPurchase(req, res);
});

// ➖ Disminuir cantidad
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

// ❌ Eliminar producto del carrito
router.post('/remove/:id', initCartSession, (req, res) => {
  const productId = req.params.id;
  req.session.cart = req.session.cart.filter(item => item.product._id.toString() !== productId);
  res.redirect('/cart/view');
});

// 🧹 Vaciar carrito
router.post('/clear', initCartSession, (req, res) => {
  req.session.cart = [];
  res.redirect('/cart/view');
});

// 📊 Corte de caja por usuario (cajero)
router.get('/corte-caja', isAuthenticated, async (req, res) => {
  try {
    const usuario = req.user;
    const ventas = await Sale.find({ user: usuario._id }).sort({ date: -1 });
    const totalAcumulado = ventas.reduce((acc, venta) => acc + venta.total, 0);
    res.render('cart/corteCaja', { usuario, ventas, totalAcumulado });
  } catch (error) {
    console.error("❌ Error en corte de caja:", error);
    res.status(500).send('Error al obtener corte de caja');

  }
});

router.get('/reprint-ticket', isAuthenticated, async (req, res) => {
  try {
    const ticket = req.session.lastTicket;
    if (!ticket) {
      return res.status(404).send('❌ No hay ticket previo para reimprimir.');
    }

    const exito = await imprimirTicket(ticket);

    if (exito) {
      res.redirect('/products');  // o puedes redirigir a una vista de confirmación si prefieres
    } else {
      res.status(500).send('❌ Error al imprimir el ticket.');
    }
  } catch (err) {
    console.error("❌ Error al reimprimir ticket:", err);
    res.status(500).send('❌ Error al reimprimir el ticket.');
  }
});

// 💾 Guardar ticket pendiente
router.post('/guardar-pendiente', isAuthenticated, initCartSession, cartController.guardarTicketPendiente);

// 📋 Ver tickets pendientes
router.get('/pendientes', isAuthenticated, async (req, res) => {
  try {
    const tickets = await Sale.find({ user: req.user._id, status: 'pendiente' }).populate('items.product');
    res.render('cart/pendientes', { tickets });
  } catch (err) {
    console.error("❌ Error al cargar pendientes:", err);
    res.status(500).send('Error al mostrar pendientes');
  }
});


// ❌ Cancelar (eliminar) ticket pendiente
router.post('/cancelar-pendiente/:id', isAuthenticated, async (req, res) => {
  try {
    await Sale.findOneAndDelete({ _id: req.params.id, user: req.user._id, status: 'pendiente' });
    res.redirect('/cart/pendientes');
  } catch (error) {
    console.error("❌ Error al cancelar pendiente:", error);
    res.status(500).send('Error al cancelar ticket pendiente');
  }
});

// 📥 Cargar ticket pendiente al carrito
router.post('/cargar-pendiente/:id', isAuthenticated, cartController.cargarPendiente);



module.exports = router;
