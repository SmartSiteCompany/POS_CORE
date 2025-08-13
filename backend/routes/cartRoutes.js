const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const cartController = require('../controllers/cartController');
const isAuthenticated = require('../middleware/isAuthenticated');
const imprimirTicketTxt = require('../utils/imprimirTicketTxt');
const saleController = require('../controllers/saleController');

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

// 🛒 Ver carrito + filtros de productos
router.get('/view', isAuthenticated, initCartSession, async (req, res) => {
  try {
    const cart = req.session.cart;
    const appliedPriceType = req.session.appliedPriceType;
    const { subtotal, tax, total } = calcularTotales(cart, appliedPriceType);
    req.session.cartTotal = total;

    // Filtros para buscar productos y agregarlos desde el carrito
    const searchQuery = (req.query.search || '').trim();
    const minStock = parseInt(req.query.minStock || '') || 0;
    const categoryFilter = (req.query.category || '').trim();
    const page = parseInt(req.query.page || '1', 10);
    const limit = 12; // compacto para carrito
    const skip = (page - 1) * limit;

    const filter = {};
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { barcode: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    if (minStock) filter.stock = { $gte: minStock };
    if (categoryFilter) filter.category = categoryFilter;

    const [productos, totalProducts, categoriesRaw, pendientesCount] = await Promise.all([
      Product.find(filter)
        .collation({ locale: 'es', strength: 1, numericOrdering: true })
        .sort({ name: 1, _id: 1 })
        .skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      Product.distinct('category'),
      Sale.countDocuments({ user: req.user._id, status: 'pendiente' }) // 👈 contador para el badge
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    const categories = (categoriesRaw || []).filter(Boolean).sort((a, b) =>
      String(a).localeCompare(String(b), 'es', { sensitivity: 'base' })
    );

    res.render('cart/view', {
      cart,
      subtotal,
      tax,
      total,
      appliedPriceType,
      // para filtros
      productos,
      categories,
      currentCategory: categoryFilter,
      searchQuery,
      minStock,
      currentPage: page,
      totalPages,
      pendientesCount
    });
  } catch (err) {
    console.error("❌ Error en /cart/view:", err);
    res.status(500).send('Error al cargar el carrito');
  }
});

// 🟢 Agregar producto al carrito (con soporte AJAX)
router.post('/add/:id', isAuthenticated, initCartSession, async (req, res) => {
  try {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity) || 1;

    const product = await Product.findById(productId);
    if (!product) {
      const wantsJSON = (req.headers.accept || '').includes('application/json') || req.query.ajax === '1' ||
                        ((req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest');
      if (wantsJSON) return res.status(404).json({ ok:false, message:'Producto no encontrado' });
      return res.status(404).send('Producto no encontrado');
    }

    const cart = req.session.cart;
    const index = cart.findIndex(item => item.product._id.toString() === productId);

    if (index >= 0) {
      cart[index].quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }
    req.session.cart = cart;

    const count = cart.reduce((a, it) => a + (it.quantity || 0), 0);

    const wantsJSON = (req.headers.accept || '').includes('application/json') || req.query.ajax === '1' ||
                      ((req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest');

    if (wantsJSON) {
      return res.json({ ok: true, count });
    }

    res.redirect('/cart/view');
  } catch (err) {
    console.error("❌ Error al agregar producto:", err);
    const wantsJSON = (req.headers.accept || '').includes('application/json') || req.query.ajax === '1' ||
                      ((req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest');
    if (wantsJSON) return res.status(500).json({ ok:false, message:'Error' });
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

// 💳 Checkout
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

// ✅ Reimprimir ticket
router.get('/reprint-ticket', isAuthenticated, async (req, res) => {
  try {
    const ticket = req.session.lastTicket;
    if (!ticket) {
      return res.status(400).send('⚠️ No hay ticket reciente para reimprimir.');
    }

    await imprimirTicketTxt({
      fecha: new Date(),
      productos: ticket.cart.map(item => ({
        nombre: item.name,
        cantidad: item.quantity,
        precio: item.priceAtSale
      })),
      subtotal: ticket.subtotal,
      impuestos: ticket.tax,
      total: ticket.total,
      pagado: (ticket.pagoEfectivo || 0) + (ticket.pagoTarjeta || 0) + (ticket.pagoTransferencia || 0),
      cambio: ticket.cambio || 0,
      usuario: { name: req.user.name }
    });

    res.redirect('/products');
  } catch (err) {
    console.error("❌ Error al reimprimir ticket:", err);
    res.status(500).send("Error al reimprimir ticket");
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

// ❌ Cancelar ticket pendiente
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

// 🖨️ Imprimir corte
router.post('/corte-caja/imprimir', isAuthenticated, saleController.imprimirCorteCaja);

// 🔢 (Opcional) contador del carrito para la UI
router.get('/count', initCartSession, (req, res) => {
  const cart = req.session.cart || [];
  const count = cart.reduce((acc, it) => acc + (it.quantity || 0), 0);
  res.json({ count });
});

module.exports = router;
