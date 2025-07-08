const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');

let cart = [];

// Calcular subtotal, impuestos y total
function calcularTotales() {
  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.price * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// Ver carrito
router.get('/view', (req, res) => {
  const { subtotal, tax, total } = calcularTotales();
  res.render('cart/view', { cart, subtotal, tax, total });
});

// Agregar producto al carrito
router.post('/add/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Producto no encontrado');

    let qty = parseInt(req.body.quantity);
    if (isNaN(qty) || qty <= 0) qty = 1;

    // Validar que no se agregue más que el stock disponible
    const index = cart.findIndex(item => item.product._id.toString() === product._id.toString());
    const currentQty = index > -1 ? cart[index].quantity : 0;

    if (qty + currentQty > product.stock) {
      return res.status(400).send('No hay suficiente stock disponible');
    }

    if (index > -1) {
      cart[index].quantity += qty;
    } else {
      cart.push({ product, quantity: qty });
    }

    res.redirect('/cart/view');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al agregar producto al carrito');
  }
});

// Disminuir cantidad
router.post('/decrease/:id', (req, res) => {
  const productId = req.params.id;
  const index = cart.findIndex(item => item.product._id.toString() === productId);
  if (index > -1) {
    cart[index].quantity--;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
  }
  res.redirect('/cart/view');
});

// Quitar producto
router.post('/remove/:id', (req, res) => {
  const productId = req.params.id;
  cart = cart.filter(item => item.product._id.toString() !== productId);
  res.redirect('/cart/view');
});

// Vaciar carrito
router.post('/clear', (req, res) => {
  cart = [];
  res.redirect('/cart/view');
});

// Checkout (generar ticket y actualizar stock)
router.post('/checkout', async (req, res) => {
  try {
    const { subtotal, tax, total } = calcularTotales();
    const fecha = new Date().toLocaleString('es-MX');
    const ticket = { cart, subtotal, tax, total, fecha };

    // Actualizar stock de cada producto
    for (const item of cart) {
      const productId = item.product._id;
      const cantidadComprada = item.quantity;

      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -cantidadComprada }
      });
    }

    // Guardar ticket en sesión
    req.session.ticket = ticket;

    // Limpiar carrito
    cart = [];

    // Mostrar ticket
    res.render('cart/ticket', { ticket });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar el checkout');
  }
});
// Cerrar sesión (ruta bajo /cart/logout)
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.redirect('/');
  });
});


// Descargar ticket PDF
router.get('/ticket/pdf', (req, res) => {
  const ticket = req.session.ticket;
  if (!ticket) return res.status(400).send('Ticket no disponible');

  const doc = new PDFDocument();
  res.setHeader('Content-disposition', 'attachment; filename=ticket.pdf');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text('🎫 Ticket de Compra\n', { underline: true });
  doc.text(`Fecha: ${ticket.fecha}\n`);
  doc.moveDown();

  ticket.cart.forEach(item => {
    doc.text(`${item.product.name} x${item.quantity} - $${(item.product.price * item.quantity).toFixed(2)}`);
  });

  doc.moveDown();
  doc.text(`Subtotal: $${ticket.subtotal.toFixed(2)}`);
  doc.text(`Impuestos (16%): $${ticket.tax.toFixed(2)}`);
  doc.text(`Total: $${ticket.total.toFixed(2)}`);
  doc.end();
});

// Descargar ticket JSON
router.get('/ticket/json', (req, res) => {
  const ticket = req.session.ticket;
  if (!ticket) return res.status(400).send('Ticket no disponible');

  res.setHeader('Content-disposition', 'attachment; filename=ticket.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(ticket, null, 2));
});

module.exports = router;
