const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ✅ Registro (desde pantalla de login)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.render("index", { error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role });

    res.redirect('/');
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).render("index", { error: 'Error al registrar usuario' });
  }
};

// ✅ Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("index", { error: "Email y contraseña son obligatorios" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.render("index", { error: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.render("index", { error: "Contraseña incorrecta" });

    req.session.regenerate(err => {
      if (err) {
        console.error("Error creando sesión:", err);
        return res.status(500).render("index", { error: "Error creando sesión" });
      }

      req.session.userId = user._id;
      req.session.montoInicial = null; // Reiniciar monto
      req.session.save(err => {
        if (err) {
          console.error("Error guardando sesión:", err);
          return res.status(500).render("index", { error: "Error guardando sesión" });
        }
        return res.redirect('/monto-inicial');
      });
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).render("index", { error: "Error interno en login" });
  }
};

// ✅ Mostrar lista
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.render('users/list', { users });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).send('Error al obtener usuarios');
  }
};

// ✅ Mostrar formulario de nuevo usuario
const getNewUserForm = (req, res) => {
  res.render('users/new');
};

// ✅ Crear usuario (admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!password || password.trim() === '') {
      return res.status(400).send('La contraseña es obligatoria');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('users/new', {
        error: 'El correo electrónico ya está en uso',
        user: { name, email, role }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role, image });

    res.redirect('/users');
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).send('Error al crear usuario');
  }
};

// ✅ Formulario de edición
const getEditUserForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.render('users/edit', { user });
  } catch (error) {
    console.error("Error al cargar usuario:", error);
    res.status(500).send('Error al cargar usuario');
  }
};

// ✅ Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('Usuario no encontrado');

    // Validar email duplicado
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.render('users/edit', {
        user,
        error: 'El correo electrónico ya está en uso por otro usuario.'
      });
    }

    if (req.file) user.image = req.file.filename;
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (password && password.trim() !== '') {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.redirect('/users');
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).send('Error al actualizar usuario');
  }
};

// ✅ Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/users');
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).send('Error al eliminar usuario');
  }
};

// ✅ Exportar
module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getNewUserForm,
  createUser,
  getEditUserForm,
  updateUser,
  deleteUser
};
