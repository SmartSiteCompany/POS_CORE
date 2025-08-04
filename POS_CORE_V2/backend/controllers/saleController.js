const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Config = require('../models/Config');

// Vista para corte de caja
exports.vistaCorteCaja = async (req, res) => {
  try {
    const filtro = {};
    const { user, desde, hasta, producto } = req.query;

    if (req.user.role !== 'administrador') {
      const hoy = new Date();
      const inicio = new Date(hoy.setHours(0, 0, 0, 0));
      const fin = new Date(hoy.setHours(23, 59, 59, 999));
      filtro.user = req.user._id;
      filtro.date = { $gte: inicio, $lte: fin };
    } else {
      if (user) filtro.user = user;
      if (desde || hasta) {
        filtro.date = {};
        if (desde) filtro.date.$gte = new Date(desde + 'T00:00:00');
        if (hasta) filtro.date.$lte = new Date(hasta + 'T23:59:59');
      }
    }

    if (producto) {
      const productoRegex = new RegExp(producto, 'i');
      const productos = await Product.find({
        $or: [
          { name: { $regex: productoRegex } },
          { _id: mongoose.Types.ObjectId.isValid(producto) ? producto : null }
        ]
      });
      const ids = productos.map(p => p._id);
      filtro['items.product'] = { $in: ids };
    }

    const ventas = await Sale.find(filtro).sort({ date: -1 }).populate('user').populate('items.product');
    const usuarios = req.user.role === 'administrador' ? await User.find({}, 'name montoInicial') : [];

    const totalAcumulado = ventas.reduce((acc, v) => acc + v.total, 0);
    const montoInicial = req.user.montoInicial || 0;
    const totalConMontoInicial = totalAcumulado + montoInicial;

    const totalesPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };
    ventas.forEach(v => {
      if (totalesPorMetodo[v.paymentMethod] !== undefined) {
        totalesPorMetodo[v.paymentMethod] += v.total;
      }
    });

    res.render('cart/corteCaja', {
      usuario: req.user,
      ventas,
      totalAcumulado,
      totalConMontoInicial,
      montoInicial,
      usuarios,
      selectedUser: user || '',
      desde: desde || '',
      hasta: hasta || '',
      producto: producto || '',
      totalesPorMetodo
    });
  } catch (error) {
    console.error("Error en vistaCorteCaja:", error);
    res.status(500).send("Error al cargar el corte de caja");
  }
};

// Exportar PDF
exports.exportarPDF = async (req, res) => {
  try {
    const filtro = {};
    const { user, desde, hasta, producto } = req.query;

    if (req.user.role !== 'administrador') {
      const hoy = new Date();
      const inicio = new Date(hoy.setHours(0, 0, 0, 0));
      const fin = new Date(hoy.setHours(23, 59, 59, 999));
      filtro.user = req.user._id;
      filtro.date = { $gte: inicio, $lte: fin };
    } else {
      if (user) filtro.user = user;
      if (desde || hasta) {
        filtro.date = {};
        if (desde) filtro.date.$gte = new Date(desde + 'T00:00:00');
        if (hasta) filtro.date.$lte = new Date(hasta + 'T23:59:59');
      }
    }

    if (producto) {
      const productoRegex = new RegExp(producto, 'i');
      const productos = await Product.find({
        $or: [
          { name: { $regex: productoRegex } },
          { _id: mongoose.Types.ObjectId.isValid(producto) ? producto : null }
        ]
      });
      const ids = productos.map(p => p._id);
      filtro['items.product'] = { $in: ids };
    }

    const ventas = await Sale.find(filtro).populate('user');
    const config = await Config.findOne();
    const totalAcumulado = ventas.reduce((acc, v) => acc + v.total, 0);
    const montoInicial = req.user.montoInicial || 0;
    const totalConMontoInicial = totalAcumulado + montoInicial;

    const totalesPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };
    ventas.forEach(v => {
      if (totalesPorMetodo[v.paymentMethod] !== undefined) {
        totalesPorMetodo[v.paymentMethod] += v.total;
      }
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename="corte-caja.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Corte de Caja', { align: 'center' }).moveDown();

    if (config) {
      doc.fontSize(12).text(`Negocio: ${config.businessName}`);
      doc.text(`Nombre en ticket: ${config.ticketName}`);
      doc.text(`Impuesto aplicado: ${config.taxRate}%`).moveDown();
    }
    if (req.user.role !== 'administrador') {
  ventas.length = 0;
}
    ventas.forEach(v => {
      doc.fontSize(12).text(`Fecha: ${v.date.toLocaleString()}`);
      doc.text(`Usuario: ${v.user?.name || 'N/A'}`);
      doc.text(`Método de Pago: ${v.paymentMethod}`);
      doc.text(`Total: $${v.total.toFixed(2)}`).moveDown();
    });

    doc.moveDown().fontSize(14).text(`Monto Inicial: $${montoInicial.toFixed(2)}`);
    doc.text(`Total Ventas: $${totalAcumulado.toFixed(2)}`);
    doc.text(`TOTAL CON MONTO INICIAL: $${totalConMontoInicial.toFixed(2)}`).moveDown();

    Object.entries(totalesPorMetodo).forEach(([metodo, total]) => {
      doc.text(`${metodo.toUpperCase()}: $${total.toFixed(2)}`);
    });

    doc.end();
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    res.status(500).send("Error al generar PDF");
  }
};

// Exportar Excel
exports.exportarExcel = async (req, res) => {
  try {
    const filtro = {};
    const { user, desde, hasta, producto } = req.query;

    if (req.user.role !== 'administrador') {
      const hoy = new Date();
      const inicio = new Date(hoy.setHours(0, 0, 0, 0));
      const fin = new Date(hoy.setHours(23, 59, 59, 999));
      filtro.user = req.user._id;
      filtro.date = { $gte: inicio, $lte: fin };
    } else {
      if (user) filtro.user = user;
      if (desde || hasta) {
        filtro.date = {};
        if (desde) filtro.date.$gte = new Date(desde + 'T00:00:00');
        if (hasta) filtro.date.$lte = new Date(hasta + 'T23:59:59');
      }
    }

    if (producto) {
      const productoRegex = new RegExp(producto, 'i');
      const productos = await Product.find({
        $or: [
          { name: { $regex: productoRegex } },
          { _id: mongoose.Types.ObjectId.isValid(producto) ? producto : null }
        ]
      });
      const ids = productos.map(p => p._id);
      filtro['items.product'] = { $in: ids };
    }

    const ventas = await Sale.find(filtro).populate('user');
    const config = await Config.findOne();
    const totalAcumulado = ventas.reduce((acc, v) => acc + v.total, 0);
    const montoInicial = req.user.montoInicial || 0;
    const totalConMontoInicial = totalAcumulado + montoInicial;

    const totalesPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };
    ventas.forEach(v => {
      if (totalesPorMetodo[v.paymentMethod] !== undefined) {
        totalesPorMetodo[v.paymentMethod] += v.total;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Corte de Caja');

    if (config) {
      worksheet.addRow([`Negocio: ${config.businessName}`]);
      worksheet.addRow([`Nombre en ticket: ${config.ticketName}`]);
      worksheet.addRow([`Impuesto aplicado: ${config.taxRate}%`]);
      worksheet.addRow([]);
    }

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 25 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Método de Pago', key: 'metodo', width: 20 },
      { header: 'Total', key: 'total', width: 15 }
    ];
    if (req.user.role !== 'administrador') {
  ventas.length = 0;
}

    ventas.forEach(v => {
      worksheet.addRow({
        fecha: v.date.toLocaleString(),
        usuario: v.user?.name || 'N/A',
        metodo: v.paymentMethod,
        total: v.total
      });
    });

    worksheet.addRow([]);
    worksheet.addRow({ usuario: 'Monto Inicial', total: montoInicial });
    worksheet.addRow({ usuario: 'Total Ventas', total: totalAcumulado });
    worksheet.addRow({ usuario: 'TOTAL CON MONTO INICIAL', total: totalConMontoInicial });
    Object.entries(totalesPorMetodo).forEach(([metodo, total]) => {
      worksheet.addRow({ usuario: metodo.toUpperCase(), total });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="corte-caja.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    res.status(500).send("Error al generar Excel");
  }
};
 // Agrega esta función si no la tienes exportada aún
exports.getCorteCajaPorUsuario = async (req, res) => {
  try {
    const hoy = new Date();
    const inicio = new Date(hoy.setHours(0, 0, 0, 0));
    const fin = new Date(hoy.setHours(23, 59, 59, 999));

    const ventas = await Sale.find({
      user: req.user._id,
      date: { $gte: inicio, $lte: fin }
    }).populate('items.product');

    const total = ventas.reduce((acc, v) => acc + v.total, 0);
    res.json({ ventas, total });
  } catch (error) {
    console.error("Error al obtener corte de caja por usuario:", error);
    res.status(500).json({ error: "Error al obtener corte de caja" });
  }
};
// ... (todo tu código anterior permanece igual)

exports.getCorteCajaPorUsuario = async (req, res) => {
  try {
    const hoy = new Date();
    const inicio = new Date(hoy.setHours(0, 0, 0, 0));
    const fin = new Date(hoy.setHours(23, 59, 59, 999));

    const ventas = await Sale.find({
      user: req.user._id,
      date: { $gte: inicio, $lte: fin }
    }).populate('items.product');

    const total = ventas.reduce((acc, v) => acc + v.total, 0);
    res.json({ ventas, total });
  } catch (error) {
    console.error("Error al obtener corte de caja por usuario:", error);
    res.status(500).json({ error: "Error al obtener corte de caja" });
  }
};

// ✅ Esta función estaba faltando y causaba el error en saleRoutes.js
exports.createSale = async (req, res) => {
  try {
    const { items, total, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No hay productos en la venta' });
    }

    // Validar stock y actualizarlo
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
      }

      product.stock -= item.quantity;
      await product.save();
    }

    const nuevaVenta = new Sale({
      user: req.user._id,
      items,
      total,
      paymentMethod,
      date: new Date()
    });

    await nuevaVenta.save();

    res.status(201).json({ message: 'Venta registrada exitosamente' });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

