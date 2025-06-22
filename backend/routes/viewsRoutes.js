const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { setMontoInicial, getMontoInicial } = require("../config/monto"); // ✅ Importación correcta

// ✅ Mostrar la página de monto inicial
router.get("/monto-inicial", (req, res) => {
    res.render("montoInicial");
});

// ✅ Procesar el monto inicial y redirigir a productos
router.post("/monto-inicial", (req, res) => {
    setMontoInicial(req.body.monto);
    res.redirect("/products"); // 🔄 Después de ingresar el monto, el usuario accede a los productos
});

// ✅ Mostrar todos los productos
router.get("/products", async (req, res) => {
    try {
        const products = await Product.find();
        const categories = await Product.distinct("category");
        const searchQuery = req.query.search || "";
        const minStock = req.query.minStock || 0;
        const montoInicial = getMontoInicial(); // ✅ Obtiene el monto inicial

        res.render("products/list", {
            categories,
            currentCategory: "",
            searchQuery,
            minStock,
            products,
            montoInicial // ✅ Pasamos el monto inicial a la vista
        });
    } catch (error) {
        res.status(500).send("Error al cargar productos");
    }
});

// ✅ Mostrar formulario para agregar productos
router.get("/products/new", (req, res) => {
    res.render("products/new", { errors: [], montoInicial: getMontoInicial() }); // ✅ Agregar monto inicial
});

// ✅ Agregar producto
router.post("/products/add", async (req, res) => {
    try {
        const { name, category, price, stock, barcode, description } = req.body;

        // 🔄 Validaciones de los campos requeridos
        const errors = [];
        if (!name) errors.push({ param: "name", msg: "El nombre es obligatorio" });
        if (!category) errors.push({ param: "category", msg: "La categoría es obligatoria" });
        if (!price || isNaN(price) || price <= 0) errors.push({ param: "price", msg: "El precio debe ser un número válido y mayor a 0" });

        if (errors.length > 0) {
            return res.render("products/new", { errors, montoInicial: getMontoInicial() }); // ✅ Agregar monto inicial
        }

        // ✅ Crear el producto con valores organizados
        const newProduct = new Product({
            name,
            category,
            price,
            stock: stock || 0,
            barcode: barcode || "",
            description: description || "",
        });

        await newProduct.save();
        res.redirect("/products"); // ✅ Redirigir después de agregar
    } catch (error) {
        console.error("Error al agregar producto:", error);
        res.status(500).send("Error al agregar producto");
    }
});

// ✅ Mostrar formulario para editar productos
router.get("/products/edit/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render("products/edit", { product, errors: [], montoInicial: getMontoInicial() }); // ✅ Agregar monto inicial
    } catch (error) {
        res.status(500).send("Error al cargar producto para edición");
    }
});

// ✅ Editar producto
router.post("/products/edit/:id", async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); // ✅ Actualiza correctamente
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
            montoInicial: getMontoInicial() // ✅ Agregar monto inicial en búsqueda
        });
    } catch (error) {
        res.status(500).send("Error en la búsqueda");
    }
    
});
// ✅ Ruta de inicio general
router.get("/", (req, res) => {
    res.render("montoInicial");
});

module.exports = router;
