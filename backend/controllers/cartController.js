const Product = require('../models/Product');
const Sale = require('../models/Sale');
const imprimirTicketTxt = require('../utils/imprimirTicketTxt');

// 🟢 Procesar compra
exports.processPurchase = async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const tipoPago = req.body.tipoPago;
    const tipoPrecioAplicado = req.session.appliedPriceType || 'pricePieza';

    if (!tipoPago || !['efectivo', 'tarjeta', 'transferencia', 'mixto'].includes(tipoPago)) {
      return res.status(400).send('Tipo de pago inválido');
    }

    if (cart.length === 0) {
      return res.status(400).send('El carrito está vacío');
    }

    let subtotal = 0;
    const taxRate = 0.16;

    const processedItems = await Promise.all(cart.map(async item => {
      const product = await Product.findById(item.product._id || item.productId);
      if (!product) throw new Error(`Producto ${item.product._id || item.productId} no encontrado`);

      const precioUsado = product[tipoPrecioAplicado] || product.pricePieza;
      subtotal += precioUsado * item.quantity;

      return {
        product: product._id,
        quantity: item.quantity,
        priceAtSale: precioUsado,
        name: product.name,
        currentStock: product.stock
      };
    }));

    // Validar stock
    const sinStock = processedItems.find(item => item.currentStock < item.quantity);
    if (sinStock) {
      return res.status(400).send(`Stock insuficiente para el producto "${sinStock.name}". Solo hay ${sinStock.currentStock} unidades.`);
    }

    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Descontar stock
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Montos por método
    let pagoEfectivo = 0, pagoTarjeta = 0, pagoTransferencia = 0;

    if (tipoPago === 'mixto') {
      pagoEfectivo = parseFloat(req.body.montoEfectivo) || 0;
      pagoTarjeta = parseFloat(req.body.montoTarjeta) || 0;
      pagoTransferencia = parseFloat(req.body.montoTransferencia) || 0;

      const suma = pagoEfectivo + pagoTarjeta + pagoTransferencia;
      if (suma < total) {
        return res.status(400).send('❌ El total ingresado no cubre el monto total de la compra.');
      }
      if (pagoTarjeta > total) {
        return res.status(400).send('❌ El pago con tarjeta no puede ser mayor al total.');
      }
    } else if (tipoPago === 'tarjeta') {
      // Tarjeta: forzamos monto exacto
      pagoTarjeta = total;
    } else if (tipoPago === 'transferencia') {
      // Transferencia: forzamos monto exacto
      pagoTransferencia = total;
    } else {
      // Efectivo: validar monto ingresado
      const monto = parseFloat(req.body.monto) || 0;
      if (monto < total) {
        return res.status(400).send('❌ El monto ingresado no cubre el total.');
      }
      pagoEfectivo = monto;
    }

    const totalIngresado = pagoEfectivo + pagoTarjeta + pagoTransferencia;
    const cambio = totalIngresado - total > 0 ? totalIngresado - total : 0;

    const newSale = new Sale({
      items: processedItems.map(i => ({
        product: i.product,
        quantity: i.quantity,
        priceAtSale: i.priceAtSale
      })),
      total,
      paymentMethod: tipoPago,
      pagoEfectivo,
      pagoTarjeta,
      pagoTransferencia,
      cambio,
      user: req.user._id,
      status: 'finalizado'
    });

    await newSale.save();
    await newSale.populate('user');

    // Limpiar carrito
    req.session.cart = [];
    req.session.appliedPriceType = 'pricePieza';

    // Guardar último ticket en sesión
    const ticket = {
      fecha: newSale.date.toLocaleString('es-MX'),
      cart: processedItems,
      subtotal,
      tax,
      total,
      tipoPago,
      tipoPrecioAplicado,
      pagoEfectivo,
      pagoTarjeta,
      pagoTransferencia,
      cambio
    };
    req.session.lastTicket = ticket;

    // Imprimir
    try {
      await imprimirTicketTxt({
        fecha: newSale.date,
        productos: processedItems.map(item => ({
          nombre: item.name,
          cantidad: item.quantity,
          precio: item.priceAtSale
        })),
        subtotal,
        impuestos: tax,
        total,
        pagado: totalIngresado,
        cambio,
        usuario: { name: req.user.name }
      });
    } catch (err) {
      console.error("❌ Error al imprimir ticket:", err.message);
    }

    // ✅ Volver al carrito con mensaje de éxito
    req.session.flash = { success: '✅ Venta registrada correctamente.' };
    return res.redirect('/cart/view');

  } catch (error) {
    console.error(error);
    // Puedes redirigir al carrito con un mensaje de error si prefieres:
    req.session.flash = { error: '❌ Error al procesar la compra: ' + error.message };
    return res.redirect('/cart/view');
    // O, si quieres mantener los 500s:
    // res.status(500).send('Error al procesar la compra: ' + error.message);
  }
};

// 🧾 Formulario de pago
exports.renderPaymentForm = (req, res) => {
  const method = req.query.method;
  if (method === 'mixto') {
    return res.render('cart/payment-mixto');
  }
  res.render('cart/payment', { method });
};

// 💾 Guardar ticket como pendiente
exports.guardarTicketPendiente = async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const tipoPrecioAplicado = req.session.appliedPriceType || 'pricePieza';

    if (cart.length === 0) {
      return res.status(400).send('El carrito está vacío');
    }

    let subtotal = 0;
    const taxRate = 0.16;

    const processedItems = await Promise.all(cart.map(async item => {
      const product = await Product.findById(item.product._id || item.productId);
      if (!product) throw new Error(`Producto no encontrado`);
      const precioUsado = product[tipoPrecioAplicado] || product.pricePieza;
      subtotal += precioUsado * item.quantity;
      return {
        product: product._id,
        quantity: item.quantity,
        priceAtSale: precioUsado
      };
    }));

    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const nuevaVenta = new Sale({
      items: processedItems,
      total,
      user: req.user._id,
      status: 'pendiente'
    });

    await nuevaVenta.save();

    req.session.cart = [];
    req.session.appliedPriceType = 'pricePieza';

    res.redirect('/cart/pendientes');
  } catch (error) {
    console.error("❌ Error al guardar pendiente:", error);
    res.status(500).send('Error al guardar ticket pendiente');
  }
};

// 🔄 Cargar ticket pendiente al carrito
exports.cargarPendiente = async (req, res) => {
  try {
    const venta = await Sale.findById(req.params.id).populate('items.product');
    if (!venta || venta.status !== 'pendiente') {
      req.session.flash = { error: '⚠️ Ticket no encontrado o ya finalizado.' };
      return res.redirect('/cart/pendientes');
    }

    req.session.cart = venta.items.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));

    await Sale.findByIdAndDelete(req.params.id);

    req.session.flash = { success: '✅ Ticket cargado al carrito correctamente.' };
    res.redirect('/cart/view');
  } catch (error) {
    console.error("❌ Error al cargar pendiente:", error);
    req.session.flash = { error: '❌ Error al cargar ticket pendiente.' };
    res.redirect('/cart/pendientes');
  }
};
