const User = require('../models/User');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).send('El usuario ya existe');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashedPassword, role });

        res.redirect('/'); // ✅ Ir a login (index.ejs)
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).send('Error al registrar usuario');
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send('Usuario no encontrado');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send('Contraseña incorrecta');
        }

        // ✅ Guardar usuario en sesión
        req.session.user = user;

        res.redirect('/monto-inicial'); // ✅ Redirigir
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).send('Error al iniciar sesión');
    }
};

module.exports = { registerUser, loginUser };
