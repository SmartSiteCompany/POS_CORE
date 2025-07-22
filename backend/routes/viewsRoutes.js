const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const isAuthenticated = require('../middleware/isAuthenticated');
const checkRole = require('../middleware/authRole');
const { setMontoInicial, getMontoInicial } = require("../config/monto");
// ✅ Página principal
router.get("/", (req, res) => {
    res.render("index");
});

// ✅ Mostrar la página de monto inicial (después del login)

router.get("/monto-inicial", isAuthenticated, (req, res) => {
    res.render("montoInicial", { user: req.user });
});

router.post("/monto-inicial", isAuthenticated, (req, res) => {
    setMontoInicial(req.body.monto);
    res.redirect("/products");
});

router.get("/products", isAuthenticated, async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const minStock = req.query.minStock || 0;
        const montoInicial = getMontoInicial();

        const products = await Product.find();
        const categories = await Product.distinct("category");

        res.render("products/list", {
            categories,
            currentCategory: "",
            searchQuery,
            minStock,
            products,
            montoInicial,
            user: req.user // necesario para mostrar botones según rol
        });
    } catch (error) {
        res.status(500).send("Error al cargar productos");
    }
});


// ✅ Mostrar formulario para agregar productos
router.get("/products/new", (req, res) => {
    res.render("products/new", { errors: [], montoInicial: getMontoInicial() });
});

// ✅ Agregar producto
router.post("/products/add", async (req, res) => {
    try {
        const { name, category, price, stock, barcode, description } = req.body;


        const errors = [];
        if (!name) errors.push({ param: "name", msg: "El nombre es obligatorio" });
        if (!category) errors.push({ param: "category", msg: "La categoría es obligatoria" });
        if (!price || isNaN(price) || price <= 0) errors.push({ param: "price", msg: "El precio debe ser un número válido y mayor a 0" });

        if (errors.length > 0) {
            return res.render("products/new", { errors, montoInicial: getMontoInicial() });
        }


        const newProduct = new Product({
            name,
            category,
            price,
            stock: stock || 0,
            barcode: barcode || "",
            description: description || "",
        });

        await newProduct.save();

        res.redirect("/products");

    } catch (error) {
        console.error("Error al agregar producto:", error);
        res.status(500).send("Error al agregar producto");
    }
});

// ✅ Editar producto
router.get("/products/edit/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

    } catch (error) {
        res.status(500).send("Error al cargar producto para edición");
    }
});


router.post("/products/edit/:id", async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });

        res.redirect("/products");
    } catch (error) {
        res.status(500).send("Error al editar producto");
    }
});

// ✅ Eliminar producto
router.post("/products/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/products");
    } catch (error) {
        res.status(500).send("Error al eliminar producto");
    }
});

// ✅ Buscar productos
router.get("/products/search", async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const products = await Product.find({ name: { $regex: searchQuery, $options: "i" } });

        res.render("products/list", {
            categories: await Product.distinct("category"),
            currentCategory: "",
            searchQuery,
            minStock: 0,
            products,
            montoInicial: getMontoInicial()

        });
    } catch (error) {
        res.status(500).send("Error en la búsqueda");
    }

});



module.exports = router;
