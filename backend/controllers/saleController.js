const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Config = require('../models/Config');
const imprimirCorteCajaTxt = require('../utils/imprimirCorteCajaTxt');
const imprimirTicketTxt = require('../utils/imprimirTicketTxt');

// ------- Helpers -------
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

async function buildFiltro(req) {
  const filtro = {};
  const { user, desde, hasta, producto } = req.query;

  // No admin -> solo sus ventas del día
  if (req.user.role !== 'administrador') {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);
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

  // Filtro por producto (ID o por nombre)
  if (producto && producto.trim()) {
    const term = producto.trim();
    const or = [{ name: { $regex: new RegExp(term, 'i') } }];
    if (mongoose.Types.ObjectId.isValid(term)) {
      or.push({ _id: term });
    }
    const productos = await Product.find({ $or: or }).select('_id');
    const ids = productos.map(p => p._id);
    filtro['items.product'] = { $in: ids.length ? ids : [new mongoose.Types.ObjectId('000000000000000000000000')] };
  }

  return filtro;
}

// ------- Vista Corte de Caja (con paginación) -------
exports.vistaCorteCaja = async (req, res) => {
  try {
    const { user, desde, hasta, producto } = req.query;
    const currentPage = clamp(parseInt(req.query.page || '1', 10) || 1, 1, 1e9);
    const pageSize = clamp(parseInt(req.query.limit || '12', 10) || 12, 5, 100);
    const skip = (currentPage - 1) * pageSize;

    const filtro = await buildFiltro(req);

    // Totales globales (NO paginados)
    const ventasAll = await Sale.find(filtro).populate('user', 'name').lean();
    const totalAcumulado = ventasAll.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalesPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0 };
    ventasAll.forEach(v => {
      if (totalesPorMetodo[v.paymentMethod] !== undefined) {
        totalesPorMetodo[v.paymentMethod] += Number(v.total || 0);
      }
    });

    const montoInicial = Number(req.user.montoInicial || 0);
    const totalConMontoInicial = totalAcumulado + montoInicial;

    // Conteo + página
    const totalVentas = ventasAll.length; // ya lo tenemos de la consulta anterior
    const totalPages = Math.max(Math.ceil(totalVentas / pageSize), 1);

    const ventas = await Sale.find(filtro)
      .populate('user', 'name')
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Usuarios para filtros/tabla
    const usuarios = (req.user.role === 'administrador')
      ? await User.find({}, 'name montoInicial').lean()
      : [];

    // 🖨️ Imprimir automáticamente con TODAS las ventas filtradas
    await imprimirCorteCajaTxt({
      fecha: new Date(),
      usuario: req.user,
      ventas: ventasAll,
      total: totalAcumulado,
      totalConMontoInicial,
      montoInicial,
      totalesPorMetodo
    });

    res.render('cart/corteCaja', {
      usuario: req.user,
      usuarios,
      ventas,
      // filtros
      selectedUser: user || '',
      desde: desde || '',
      hasta: hasta || '',
      producto: producto || '',
      // resumen
      totalAcumulado,
      totalConMontoInicial,
      montoInicial,
      totalesPorMetodo,
      flash: req.session.flash || null,
      // paginación
      currentPage,
      totalPages,
      pageSize
    });
    req.session.flash = null;
  } catch (error) {
    console.error("Error en vistaCorteCaja:", error);
    res.status(500).send("Error al cargar el corte de caja");
  }
};

// ------- Exportar PDF (igual que tenías) -------
exports.exportarPDF = async (req, res) => {
  try {
    const filtro = await buildFiltro(req);

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
      ventas.length = 0; // ocultar detalle a no-admin
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

// ------- Exportar Excel (igual que tenías) -------
exports.exportarExcel = async (req, res) => {
  try {
    const filtro = await buildFiltro(req);

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
      ventas.length = 0; // ocultar detalle a no-admin
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

// ------- NUEVO: Exportar JSON -------
// ------- Exportar JSON (forzar descarga) -------
exports.exportarJSON = async (req, res) => {
  try {
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const currentPage = clamp(parseInt(req.query.page || '1', 10) || 1, 1, 1e9);
    const pageSize   = clamp(parseInt(req.query.limit || '100', 10) || 100, 5, 1000);
    const skip = (currentPage - 1) * pageSize;

    // usa tu helper/buildFiltro si ya lo tienes, o copia su lógica aquí
    const filtro = await (exports.buildFiltro ? exports.buildFiltro(req) : (async () => {
      const mongoose = require('mongoose');
      const Product = require('../models/Product');
      const filtro = {};
      const { user, desde, hasta, producto } = req.query;

      if (req.user.role !== 'administrador') {
        const hoy = new Date();
        const inicio = new Date(hoy); inicio.setHours(0,0,0,0);
        const fin    = new Date(hoy); fin.setHours(23,59,59,999);
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
      if (producto && producto.trim()) {
        const term = producto.trim();
        const or = [{ name: { $regex: new RegExp(term, 'i') } }];
        if (mongoose.Types.ObjectId.isValid(term)) or.push({ _id: term });
        const productos = await Product.find({ $or: or }).select('_id');
        const ids = productos.map(p => p._id);
        filtro['items.product'] = { $in: ids.length ? ids : [new mongoose.Types.ObjectId('000000000000000000000000')] };
      }
      return filtro;
    })());

    const total = await Sale.countDocuments(filtro);

    const ventas = await Sale.find(filtro)
      .populate('user', 'name')
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Resumen global (sin paginar)
    const all = await Sale.aggregate([
      { $match: filtro },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' } } }
    ]);

    // Evita la clave "null" en el JSON
    const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0, sinMetodo: 0 };
    let totalAcumulado = 0;
    all.forEach(r => {
      const k = r._id || 'sinMetodo';
      if (!(k in porMetodo)) porMetodo[k] = 0;
      porMetodo[k] += r.total;
      totalAcumulado += r.total;
    });

    const montoInicial = Number(req.user.montoInicial || 0);
    const totalConMontoInicial = totalAcumulado + montoInicial;

    // Si quieres ocultar detalle a no-admins (igual que PDF/Excel), descomenta:
    // if (req.user.role !== 'administrador') ventas.length = 0;

    const payload = {
      ok: true,
      meta: {
        total,
        currentPage,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
        filters: {
          user: req.query.user || '',
          desde: req.query.desde || '',
          hasta: req.query.hasta || '',
          producto: req.query.producto || ''
        }
      },
      resumen: {
        montoInicial,
        totalVentas: totalAcumulado,
        totalConMontoInicial,
        porMetodo
      },
      ventas: ventas.map(v => ({
        id: v._id,
        date: v.date,
        userId: v.user?._id || null,
        user: v.user?.name || null,
        paymentMethod: v.paymentMethod || null,
        total: v.total
      }))
    };

    // 👇 Fuerza la descarga
    const filename = `corte-caja_${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2)); // pretty-print
  } catch (error) {
    console.error('Error al exportar JSON:', error);
    // aquí no forzamos descarga en error
    res.status(500).json({ ok: false, error: 'Error al generar JSON' });
  }
};


// ------- API auxiliares que ya tenías -------
exports.getCorteCajaPorUsuario = async (req, res) => {
  try {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);

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

exports.createSale = async (req, res) => {
  try {
    const { items, total, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No hay productos en la venta' });
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
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

exports.imprimirCorteCaja = async (req, res) => {
  try {
    const usuario = req.user;
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy);
    hasta.setHours(23, 59, 59, 999);

    const ventas = await Sale.find({
      user: usuario._id,
      date: { $gte: desde, $lte: hasta }
    });

    const total = ventas.reduce((acc, v) => acc + v.total, 0);
    const montoInicial = usuario.montoInicial || 0;

    await imprimirCorteCajaTxt({
      ventas,
      usuario,
      montoInicial,
      total,
      fecha: new Date()
    });

    res.redirect('/cart/corte-caja');
  } catch (error) {
    console.error("❌ Error al imprimir corte de caja:", error);
    res.status(500).send("Error al imprimir corte de caja");
  }
};
