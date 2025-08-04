const Sale = require('../models/Sale');

exports.getDashboard = async (req, res) => {
  try {
    const ventas = await Sale.find().populate('items.product');

    const totalVentas = ventas.length;
    const ingresosTotales = ventas.reduce((acc, venta) => acc + venta.total, 0);

    // Acumulador de productos
    const productosVendidos = {};
    const metodosPago = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };

    ventas.forEach(v => {
      v.items.forEach(i => {
        const nombre = i.product?.name || 'Desconocido';
        productosVendidos[nombre] = (productosVendidos[nombre] || 0) + i.quantity;
      });

      metodosPago[v.paymentMethod] += v.total;
    });

    const productosMasVendidos = Object.entries(productosVendidos)
      .map(([nombre, totalVendido]) => ({ nombre, totalVendido }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
      .slice(0, 5);

    res.render('dashboard/index', {
      totalVentas,
      ingresosTotales,
      productosMasVendidos,
      metodosPago,
      user: req.user
    });
  } catch (err) {
    console.error('Error al generar dashboard:', err);
    res.status(500).send('Error al cargar dashboard');
  }
};
