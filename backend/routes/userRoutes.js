const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // ✅ Importación faltante

const {
  registerUser,
  loginUser,
  getUsers,
  getNewUserForm,
  createUser,
  getEditUserForm,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const isAuthenticated = require('../middleware/isAuthenticated');
const checkRole = require('../middleware/authRole');

// Rutas públicas
router.post('/login', loginUser);
router.post('/register', registerUser);

// ✅ Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// ✅ Rutas protegidas (solo admin)
router.use(isAuthenticated);
router.use(checkRole('administrador'));

router.get('/', getUsers);
router.get('/new', getNewUserForm);
router.post('/', upload.single('image'), createUser); // ✅ Procesa imagen

router.get('/edit/:id', getEditUserForm);
router.post('/edit/:id', upload.single('image'), updateUser); // ✅ Procesa imagen al editar

router.post('/delete/:id', deleteUser);

module.exports = router;
