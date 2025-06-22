const app = require('./app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Conectar a MongoDB y luego iniciar el servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al conectar a MongoDB:', err);
});