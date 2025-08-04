// ✅ server.js CORREGIDO con corte automático cada 12h y cierre de sesiones
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require("path");
const session = require('express-session');
const User = require('./models/User');
const Sale = require('./models/Sale');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');

const app = express();
connectDB();

// ✅ Sesión persistente con MongoStore
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions'
});

// ✅ Middlewares base
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'equipocore123',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hora
}));

// ✅ Cargar usuario
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.user = user;
      }
    } catch (error) {
      console.error('❌ Error cargando usuario desde sesión:', error);
    }
  } else {
    res.locals.user = null;
  }
  next();
});

app.use((req, res, next) => {
  res.locals.currentUrl = req.originalUrl;
  next();
});

// ✅ EJS y estáticos
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Rutas
app.use("/cart", require('./routes/cartRoutes'));
app.use("/products", require('./routes/productRoutes'));
app.use("/auth", require('./routes/authRoutes'));
app.use("/api/sales", require('./routes/saleRoutes'));
app.use("/users", require('./routes/userRoutes'));
app.use("/", require('./routes/configRoutes'));
app.use("/", require('./routes/viewsRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/self-checkout', require('./routes/selfCheckoutRoutes'));


// ✅ CRON cada 12 horas: Corte de caja + cerrar sesiones
cron.schedule('0 0,12 * * *', async () => {
  try {
    console.log('⏰ Ejecutando corte de caja automático...');

    const users = await User.find();
    const now = new Date();
    const start = new Date(now);
    start.setHours(now.getHours() - 12);

    for (const user of users) {
      const ventas = await Sale.find({
        user: user._id,
        date: { $gte: start, $lte: now }
      });

      if (ventas.length > 0) {
        console.log(`📊 Corte automático para ${user.name}: ${ventas.length} ventas.`);
        // Aquí puedes guardar un resumen, enviar correo, etc.
      }
    }

    // ✅ Cierre de sesiones automáticamente
    sessionStore.all((err, sessions) => {
      if (err) return console.error('❌ Error al obtener sesiones:', err);

      for (let sid in sessions) {
        sessionStore.destroy(sid, (err) => {
          if (err) console.error(`❌ Error al destruir sesión ${sid}:`, err);
          else console.log(`🔒 Sesión cerrada automáticamente: ${sid}`);
        });
      }
    });

    console.log('✅ Corte automático finalizado.');
  } catch (err) {
    console.error('❌ Error en corte de caja automático:', err);
  }
});

app.listen(5000, () => console.log('🔥 Servidor corriendo en el puerto 5000'));

// FIN
