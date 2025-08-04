const Product = require('../models/Product');
const imprimirTicketAuto = require('../utils/imprimirTicketAuto');
const QRCode = require('qrcode');

exports.mostrarProductos = async (req, res) => {
  try {
    const search = req.query.q || '';
    const query = { stock: { $gt: 0 } };

    if (search) {
      query.name = { $regex: search, $options: 'i' }; // búsqueda insensible a mayúsculas
    }

    const productos = await Product.find(query).limit(100);
    res.render('self-checkout/products', { productos, search });
  } catch (error) {
    console.error("❌ Error cargando productos autocobro:", error);
    res.status(500).send('Error al mostrar productos');
  }
};

// Inicializar carrito
function initCart(req) {
  if (!req.session.autoCart) req.session.autoCart = [];
}

// Agregar producto al carrito
exports.agregarAlCarrito = async (req, res) => {
  try {
    initCart(req);

    const productId = req.body.productId;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Producto no encontrado');

    const index = req.session.autoCart.findIndex(item => item.product._id == productId);

    if (index >= 0) {
      req.session.autoCart[index].quantity += 1;
    } else {
      req.session.autoCart.push({ product, quantity: 1 });
    }

    res.redirect('/self-checkout/cart');
  } catch (err) {
    console.error("❌ Error al agregar al carrito:", err);
    res.status(500).send('Error');
  }
};

// Ver carrito
exports.verCarrito = (req, res) => {
  initCart(req);
  const cart = req.session.autoCart;

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.pricePieza * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  res.render('self-checkout/cart', { cart, subtotal, tax, total });
};

// Eliminar producto
exports.eliminarDelCarrito = (req, res) => {
  initCart(req);
  const id = req.params.id;
  req.session.autoCart = req.session.autoCart.filter(item => item.product._id != id);
  res.redirect('/self-checkout/cart');
};

exports.renderPago = (req, res) => {
  const cart = req.session.autoCart || [];

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.pricePieza * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  res.render('self-checkout/payment', { total });
};

exports.procesarPago = async (req, res) => {
  try {
    const cart = req.session.autoCart || [];
    if (cart.length === 0) {
      return res.redirect('/self-checkout/products');
    }

    const metodo = req.body.metodo;
    const montoIngresado = parseFloat(req.body.monto) || 0;

    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.product.pricePieza * item.quantity;
    });
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    if (montoIngresado < total) {
      return res.send('❌ El monto ingresado no cubre el total.');
    }

    const cambio = montoIngresado - total;

    const processedItems = cart.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      priceAtSale: item.product.pricePieza
    }));

    const newSale = new Sale({
      items: processedItems,
      total,
      paymentMethod: metodo,
      pagoEfectivo: metodo === 'efectivo' ? montoIngresado : 0,
      pagoTarjeta: metodo === 'tarjeta' ? montoIngresado : 0,
      pagoTransferencia: metodo === 'transferencia' ? montoIngresado : 0,
      cambio,
      user: null, // puedes asignar un usuario fijo si deseas
      status: 'finalizado'
    });

    await newSale.save();

    req.session.autoCart = [];

    const ticket = {
      fecha: newSale.date.toLocaleString('es-MX'),
      cart,
      subtotal,
      tax,
      total,
      metodo,
      montoIngresado,
      cambio
    };

    req.session.lastAutoTicket = ticket;

    res.redirect('/self-checkout/success');
  } catch (error) {
    console.error("❌ Error al procesar pago:", error);
    res.status(500).send('Error al procesar el pago.');
  }
};
exports.mostrarExito = async (req, res) => {
  const ticket = req.session.lastAutoTicket;
  if (!ticket) return res.redirect('/self-checkout/products');

  // Intentar imprimir (solo una vez)
  if (!req.session.ticketImpreso) {
    await imprimirTicketAuto(ticket);
    req.session.ticketImpreso = true;
  }

  res.render('self-checkout/success', { ticket });
};

// 🎯 Mostrar QR del ticket
exports.generarQR = async (req, res) => {
  const ticket = req.session.lastAutoTicket;
  if (!ticket) return res.status(404).send('No hay ticket disponible');

  const ticketData = {
    fecha: ticket.fecha,
    productos: ticket.cart.map(i => ({
      nombre: i.product.name,
      cantidad: i.quantity,
      precio: i.product.pricePieza
    })),
    total: ticket.total,
    metodo: ticket.metodo,
    pagado: ticket.montoIngresado,
    cambio: ticket.cambio
  };

  try {
    const qrData = JSON.stringify(ticketData);
    const qrImage = await QRCode.toDataURL(qrData);
    res.send(`<img src="${qrImage}" style="width: 250px;" />`);
  } catch (err) {
    console.error('❌ Error generando QR:', err);
    res.status(500).send('Error generando QR');
  }
};
