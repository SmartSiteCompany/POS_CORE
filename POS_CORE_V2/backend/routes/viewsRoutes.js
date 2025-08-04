const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User"); // ✅ Aquí va la línea nueva
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
    // 🟢 Guardar en la sesión (opcional si ya se guarda en la BD)
    req.session.montoInicial = monto;

    // 🟢 Guardar en la base de datos
    await User.findByIdAndUpdate(req.user._id, { montoInicial: monto });

    res.redirect("/products");
  } catch (error) {
    console.error("❌ Error al guardar monto inicial en BD:", error);
    res.status(500).render("montoInicial", { user: req.user, error: "Error al guardar el monto inicial" });
  }
});



// Middleware que redirige si no se ha definido el monto inicial
function requireMontoInicial(req, res, next) {
  if (typeof req.session.montoInicial === 'number') {
    return next();
  }
  if (req.path === '/monto-inicial') return next(); // permitir acceso
  return res.redirect('/monto-inicial');
}

// Productos
router.get("/products", isAuthenticated, requireMontoInicial, async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const minStock = parseInt(req.query.minStock) || 0;
    const categoryFilter = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const filter = {
      name: { $regex: searchQuery, $options: "i" },
      stock: { $gte: minStock }
    };

    if (categoryFilter) {
      filter.category = categoryFilter;
    }

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const categories = await Product.distinct("category");

    res.render("products/list", {
      products,
      categories,
      currentCategory: categoryFilter,
      searchQuery,
      minStock,
      currentPage: page,
      totalPages,
      montoInicial: req.session.montoInicial, // 🟢 desde la sesión
      user: req.user
    });
  } catch (error) {
    console.error("Error en paginación:", error);
    res.status(500).send("Error al cargar productos");
  }
});

// Crear producto
router.get("/products/new", isAuthenticated, requireMontoInicial, checkRole('administrador'), (req, res) => {
  res.render("products/new", { errors: [], montoInicial: req.session.montoInicial });
});

// Editar producto
router.get("/products/edit/:id", isAuthenticated, requireMontoInicial, checkRole('administrador'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Producto no encontrado");
    res.render("products/edit", { product, montoInicial: req.session.montoInicial, errors: [] });
  } catch (error) {
    res.status(500).send("Error al cargar producto para edición");
  }
});

router.post("/products/edit/:id", isAuthenticated, requireMontoInicial, checkRole('administrador'), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.redirect("/products");
  } catch (error) {
    res.status(500).send("Error al editar producto");
  }
});

router.post("/products/delete/:id", isAuthenticated, requireMontoInicial, checkRole('administrador'), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/products");
  } catch (error) {
    res.status(500).send("Error al eliminar producto");
  }
});

// Corte de caja
const saleController = require('../controllers/saleController');
router.get('/corte-caja', isAuthenticated, requireMontoInicial, saleController.vistaCorteCaja);
router.get('/corte-caja/pdf', isAuthenticated, requireMontoInicial, saleController.exportarPDF);
router.get('/corte-caja/excel', isAuthenticated, requireMontoInicial, saleController.exportarExcel);

// Ticket
const ticketController = require('../controllers/ticketController');
router.get('/ticket/download', isAuthenticated, requireMontoInicial, ticketController.downloadTicket);

//
const dashboardController = require('../controllers/dashboardController');

router.get('/dashboard', isAuthenticated, checkRole('administrador'), dashboardController.getDashboard);

module.exports = router;
