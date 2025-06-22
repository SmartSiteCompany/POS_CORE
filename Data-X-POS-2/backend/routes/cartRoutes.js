const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

let cart = [];

function calcularTotales() {
  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.price * item.quantity;
  });
  const tax = subtotal * 0.16;
  const discount = subtotal > 500 ? subtotal * 0.10 : 0;
  const total = subtotal + tax - discount;
  return { subtotal, tax, discount, total };
}

router.get('/view', (req, res) => {
  const { subtotal, tax, discount, total } = calcularTotales();
  res.render('cart/view', { cart, subtotal, tax, discount, total });
});

router.post('/add/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Producto no encontrado');

    let qty = parseInt(req.body.quantity);
    if (isNaN(qty) || qty <= 0) qty = 1;

    const index = cart.findIndex(item => item.product._id.toString() === product._id.toString());
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

router.post('/remove/:id', (req, res) => {
  const productId = req.params.id;
  cart = cart.filter(item => item.product._id.toString() !== productId);
  res.redirect('/cart/view');
});

router.post('/clear', (req, res) => {
  cart = [];
  res.redirect('/cart/view');
});

router.post('/checkout', (req, res) => {
  const { subtotal, tax, discount, total } = calcularTotales();
  const fecha = new Date().toLocaleString('es-MX');
  const ticket = { cart, subtotal, tax, discount, total, fecha };
  cart = [];
  res.render('cart/ticket', { ticket });
});

module.exports = router;
