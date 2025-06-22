const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verifica si ya existe un usuario con ese correo
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Encripta la contraseña antes de guardarla en MongoDB
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });

        res.status(201).json({ message: 'Usuario registrado con éxito', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        if (!user.password) {
            return res.status(401).json({ message: 'El usuario no tiene una contraseña registrada' });
        }

        // Mensaje de depuración
        console.log("JWT_SECRET desde loginUser:", process.env.JWT_SECRET);
        console.log("Contraseña ingresada:", password);
        console.log("Contraseña almacenada:", user.password);
        console.log("Contraseña ingresada:", password);
console.log("Contraseña almacenada en MongoDB:", user.password);


        // Comparar la contraseña encriptada correctamente
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Resultado de bcrypt.compare():", isMatch);

        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña es incorrecta' });
        }

        // Generar token JWT
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'Error: JWT_SECRET no está definido en .env' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Inicio de sesión exitoso', token });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: error.message });
    }
};




module.exports = { registerUser, loginUser };
