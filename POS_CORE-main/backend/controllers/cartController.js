const Product = require('../models/Product');
const Venta = require('../models/Venta'); // modelo de ventas

// Función para calcular totales del carrito
function calcularTotales(cart) {
  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.price * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// Checkout
exports.checkout = async (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.status(400).send('Carrito vacío');
  }

  const { subtotal, tax, total } = calcularTotales(cart);
  const fecha = new Date().toLocaleString('es-MX');

  try {
    // Guardar la venta
    const venta = new Venta({
      fecha: new Date(),
      productos: cart.map(item => ({
        producto: item.product._id,
        nombre: item.product.name,
        precio: item.product.price,
        cantidad: item.quantity
      })),
      subtotal,
      tax,
      total
    });
    await venta.save();

    // Reducir stock de productos vendidos
    for (const item of cart) {
      const producto = await Product.findById(item.product._id);
      if (producto) {
        producto.stock -= item.quantity;
        await producto.save();
      }
    }

    // Guardar ticket en sesión
    req.session.ticket = { cart, subtotal, tax, total, fecha };

    // Limpiar carrito de sesión
    req.session.cart = [];

    res.render('cart/ticket', { ticket: req.session.ticket });
  } catch (error) {
    console.error('Error al finalizar compra:', error);
    res.status(500).send('Error al procesar la compra');
  }
};
