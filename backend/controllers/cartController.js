const Product = require('../models/Product');
const Sale = require('../models/Sale');

exports.processPurchase = async (req, res) => {
    try {
        const { cart } = req.body;
        let subtotal = 0;
        let totalDiscount = 0;
        let taxRate = 0.16; // 16% de impuestos

        // Procesar cada item del carrito
        const processedItems = await Promise.all(cart.map(async item => {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                throw new Error(`Producto ${item.productId} no encontrado`);
            }

            // Calcular descuento
            let finalPrice = product.price;
            let discountApplied = 0;

            if (product.discount.active && item.quantity >= product.discount.minQuantity) {
                discountApplied = product.discount.amount;
                finalPrice = product.price - discountApplied;
                totalDiscount += discountApplied * item.quantity;
            }

            subtotal += finalPrice * item.quantity;

            return {
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price
                },
                quantity: item.quantity,
                finalPrice,
                discountApplied,
                itemTotal: finalPrice * item.quantity
            };
        }));

        // Calcular impuestos y total
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        // Crear ticket
        const ticket = {
            fecha: new Date().toLocaleString(),
            cart: processedItems,
            subtotal,
            totalDescuento: totalDiscount,
            tax,
            total
        };

        // Guardar la venta en la base de datos
        const newSale = new Sale({
            items: processedItems,
            subtotal,
            discount: totalDiscount,
            tax,
            total,
            user: req.user._id
        });

        await newSale.save();

        // Renderizar la vista del ticket
        res.render('cart/success', { ticket });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al procesar la compra',
            error: error.message
        });
    }
};