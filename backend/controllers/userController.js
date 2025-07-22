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
        const newUser = await User.create({ name, email, password: hashedPassword, role });

        res.redirect('/'); // Redirige al login
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).send('Error al registrar usuario');
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).send('Usuario no encontrado');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send('Contraseña incorrecta');

        // Guardar datos en sesión
        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role
        };

        res.redirect('/monto-inicial');
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).send('Error al iniciar sesión');
    }
};

module.exports = { registerUser, loginUser };
