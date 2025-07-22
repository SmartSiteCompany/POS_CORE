require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require("path");
const session = require('express-session');
const viewsRoutes = require('./routes/viewsRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const cartRoutes = require('./routes/cartRoutes');
const authRoutes = require('./routes/authRoutes');




const app = express();
connectDB();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'equipocore123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));


// Simular usuario para pruebas si no hay login implementado
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = { name: 'Danna', role: 'administrador' }; // cambia a 'cajero' si quieres probar
  }
  req.user = req.session.user;
  next();
});
// EJS y carpeta estática
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));



// Rutas
app.use("/", viewsRoutes);
app.use('/api/users', userRoutes);
app.use('/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/cart', cartRoutes);
app.use('/auth', authRoutes);




app.listen(5000, () => console.log('🔥 Servidor corriendo en el puerto 5000'));
