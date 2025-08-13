// routes/viewsRoutes.js
const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const User = require("../models/User");
const Sale = require("../models/Sale"); // ⬅️ Necesario

const isAuthenticated = require('../middleware/isAuthenticated');
const checkRole = require('../middleware/authRole');

// Página principal (login/index)
router.get("/", (req, res) => {
  res.render("index");
});

// Monto inicial
router.get("/monto-inicial", isAuthenticated, (req, res) => {
  res.render("montoInicial", { user: req.user });
});

router.post("/monto-inicial", isAuthenticated, async (req, res) => {
  const monto = parseFloat(req.body.monto);
  if (isNaN(monto) || monto < 0) {
    return res.render("montoInicial", { user: req.user, error: "Monto inválido" });
  }
  try {
    req.session.montoInicial = monto;
    await User.findByIdAndUpdate(req.user._id, { montoInicial: monto });

    // Redirección por rol
    if (req.user && req.user.role === 'administrador') {
      return res.redirect("/admin");
    }
    if (req.user && req.user.role === 'cajero') {
      return res.redirect("/cart/view");
    }
    return res.redirect("/products");
  } catch (error) {
    console.error("❌ Error al guardar monto inicial en BD:", error);
    res.status(500).render("montoInicial", { user: req.user, error: "Error al guardar el monto inicial" });
  }
});

// Middleware que requiere monto inicial
function requireMontoInicial(req, res, next) {
  if (typeof req.session.montoInicial === 'number') return next();
  if (req.path === '/monto-inicial') return next();
  return res.redirect('/monto-inicial');
}

// ---------- Menú administrador (con KPIs de HOY) ----------
router.get("/admin",
  isAuthenticated,
  requireMontoInicial,
  checkRole('administrador'),
  async (req, res) => {
    try {
      const now = new Date();
      const inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const fin    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Ventas finalizadas HOY
      const ventasHoyDocs = await Sale.find({
        status: 'finalizado',
        date: { $gte: inicio, $lte: fin }
      })
      .select('total paymentMethod pagoEfectivo pagoTarjeta pagoTransferencia')
      .lean();

      const ventasHoy = ventasHoyDocs.reduce((acc, v) => acc + (v.total || 0), 0);

      const efectivoHoy = ventasHoyDocs.reduce((acc, v) => {
        if (v.paymentMethod === 'efectivo') return acc + (v.total || 0);
        if (v.paymentMethod === 'mixto')    return acc + (v.pagoEfectivo || 0);
        return acc;
      }, 0);

      const tarjetaHoy = ventasHoyDocs.reduce((acc, v) => {
        if (v.paymentMethod === 'tarjeta') return acc + (v.total || 0);
        if (v.paymentMethod === 'mixto')   return acc + (v.pagoTarjeta || 0);
        return acc;
      }, 0);

      const transferenciaHoy = ventasHoyDocs.reduce((acc, v) => {
        if (v.paymentMethod === 'transferencia') return acc + (v.total || 0);
        if (v.paymentMethod === 'mixto')         return acc + (v.pagoTransferencia || 0);
        return acc;
      }, 0);

      // ✅ Tickets (hoy) = ventas FINALIZADAS hoy
      const ticketsHoy = await Sale.countDocuments({
        status: 'finalizado',
        date: { $gte: inicio, $lte: fin }
      });

      // Contador global de pendientes para el chip del header
      const pendingCount = await Sale.countDocuments({ status: 'pendiente' });

      res.render("admin/menu", {
        user: req.user,
        montoInicial: req.session.montoInicial || 0,
        resumen: { ventasHoy, efectivoHoy, tarjetaHoy, transferenciaHoy, ticketsHoy },
        pendingCount,
        showBack: false // oculta “Volver” solo en /admin
      });
    } catch (e) {
      console.error('❌ Error /admin:', e);
      res.status(500).send('Error al cargar panel de administración');
    }
  }
);

// Listado de productos (con orden alfabético)
router.get("/products", isAuthenticated, requireMontoInicial, async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const minStock = parseInt(req.query.minStock) || 0;
    const categoryFilter = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const filter = {};
    if (searchQuery) filter.name = { $regex: searchQuery, $options: "i" };
    if (minStock) filter.stock = { $gte: minStock };
    if (categoryFilter) filter.category = categoryFilter;

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .collation({ locale: 'es', strength: 1, numericOrdering: true })
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    let categories = await Product.distinct("category");
    categories = (categories || []).sort((a, b) =>
      String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' })
    );

    res.render("products/list", {
      products,
      categories,
      currentCategory: categoryFilter,
      searchQuery,
      minStock,
      currentPage: page,
      totalPages,
      montoInicial: req.session.montoInicial,
      user: req.user
    });
  } catch (error) {
    console.error("Error en paginación:", error);
    res.status(500).send("Error al cargar productos");
  }
});

// Corte de caja / Ticket / Dashboard
const saleController = require('../controllers/saleController');
router.get('/corte-caja', isAuthenticated, requireMontoInicial, saleController.vistaCorteCaja);
router.get('/corte-caja/pdf', isAuthenticated, requireMontoInicial, saleController.exportarPDF);
router.get('/corte-caja/excel', isAuthenticated, requireMontoInicial, saleController.exportarExcel);
router.get('/corte-caja/json', isAuthenticated, requireMontoInicial, saleController.exportarJSON);

const ticketController = require('../controllers/ticketController');
router.get('/ticket/download', isAuthenticated, requireMontoInicial, ticketController.downloadTicket);

const dashboardController = require('../controllers/dashboardController');
router.get('/dashboard', isAuthenticated, checkRole('administrador'), dashboardController.getDashboard);

module.exports = router;
