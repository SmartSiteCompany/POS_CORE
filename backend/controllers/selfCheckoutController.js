const Product = require('../models/Product');
const Sale = require('../models/Sale');
const imprimirTicketAutoTxt = require('../utils/imprimirTicketAutoTxt');
const QRCode = require('qrcode');

// Utilidad para escapar términos en RegExp (por si la necesitas)
function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mostrar productos disponibles (con filtro por categoría + paginación)
exports.mostrarProductos = async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const selectedCat = (req.query.cat || 'all').trim();

    // Paginación
    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const perPage = 12; // <-- cambia este número si quieres más/menos por página
    const skip = (page - 1) * perPage;

    // Base: stock disponible
    const query = { stock: { $gt: 0 } };

    // Filtro por categoría (si no es "all")
    if (selectedCat && selectedCat !== 'all') {
      query.category = selectedCat; // si quieres insensible a may/min: { $regex: `^${selectedCat}$`, $options: 'i' }
    }

    // Búsqueda por nombre/código/descripcion
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Datos
    const [categoriesRaw, totalItems, productos] = await Promise.all([
      Product.distinct('category', { stock: { $gt: 0 } }),
      Product.countDocuments(query),
      Product.find(query).skip(skip).limit(perPage)
    ]);

    let categories = (categoriesRaw || [])
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }));

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    // Contador del carrito
    const cart = req.session.autoCart || [];
    const cartCount = cart.reduce((acc, it) => acc + (it.quantity || 0), 0);

    res.render('self-checkout/products', {
      productos,
      search,
      cartCount,
      categories,
      selectedCat,
      pagination: { page, perPage, totalItems, totalPages }
    });
  } catch (error) {
    console.error("❌ Error cargando productos autocobro:", error);
    res.status(500).send('Error al mostrar productos');
  }
};


// Inicializar carrito
function initCart(req) {
  if (!req.session.autoCart) req.session.autoCart = [];
}

// Agregar producto al carrito (AJAX o POST normal) con cantidad
exports.agregarAlCarrito = async (req, res) => {
  try {
    initCart(req);
    const productId = req.body.productId;
    // qty puede venir como qty o quantity; por form o JSON
    let qty = parseInt(req.body.qty ?? req.body.quantity ?? 1, 10);
    if (isNaN(qty) || qty <= 0) qty = 1;

    const product = await Product.findById(productId);
    if (!product) {
      const accept = (req.headers.accept || '');
      if (accept.includes('application/json') || req.is('application/json')) {
        return res.status(404).json({ ok: false, message: 'Producto no encontrado' });
      }
      return res.status(404).send('Producto no encontrado');
    }

    // Ver cuánto ya hay en el carrito de ese producto
    const index = req.session.autoCart.findIndex(
      item => String(item.product._id) === String(productId)
    );
    const already = index >= 0 ? (req.session.autoCart[index].quantity || 0) : 0;

    // Calcular cuánto SÍ se puede agregar respetando stock
    const canAdd = Math.max(0, Math.min(product.stock - already, qty));

    if (index >= 0) {
      if (canAdd > 0) req.session.autoCart[index].quantity += canAdd;
      // si canAdd === 0, no hacemos nada
    } else {
      if (canAdd > 0) req.session.autoCart.push({ product, quantity: canAdd });
    }

    const cartCount = req.session.autoCart.reduce((acc, it) => acc + (it.quantity || 0), 0);

    // Detección robusta de AJAX
    const xrw = (req.headers['x-requested-with'] || '').toLowerCase();
    const wantsJSON =
      xrw === 'xmlhttprequest' ||
      xrw === 'fetch' ||
      req.is('application/json') ||
      (req.headers.accept || '').includes('application/json') ||
      (req.query && req.query.ajax === '1');

    if (wantsJSON) {
      // Devolvemos info útil por si la quieres usar
      return res.json({
        ok: canAdd > 0,
        count: cartCount,
        added: canAdd,
        inCart: (index >= 0 ? already + canAdd : canAdd),
        stock: product.stock,
        message: canAdd > 0 ? 'Agregado' : 'Sin stock disponible'
      });
    }

    // Fallback sin JS → redirige como siempre
    return res.redirect('/self-checkout/cart');
  } catch (err) {
    console.error("❌ Error al agregar al carrito:", err);
    const accept = (req.headers.accept || '');
    if (accept.includes('application/json') || req.is('application/json')) {
      return res.status(500).json({ ok: false, message: 'Error' });
    }
    res.status(500).send('Error');
  }
};


// Ver carrito
exports.verCarrito = (req, res) => {
  initCart(req);
  const cart = req.session.autoCart;

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.pricePieza * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  res.render('self-checkout/cart', { cart, subtotal, tax, total });
};

// Eliminar producto del carrito
exports.eliminarDelCarrito = (req, res) => {
  initCart(req);
  const id = req.params.id;
  req.session.autoCart = req.session.autoCart.filter(item => item.product._id != id);
  res.redirect('/self-checkout/cart');
};

// Mostrar vista de pago
exports.renderPago = (req, res) => {
  const cart = req.session.autoCart || [];

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.product.pricePieza * item.quantity;
  });
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  res.render('self-checkout/payment', { total });
};

// Procesar pago
exports.procesarPago = async (req, res) => {
  try {
    const cart = req.session.autoCart || [];
    if (cart.length === 0) return res.redirect('/self-checkout/products');

    const metodo = req.body.metodo;
    const montoIngresado = parseFloat(req.body.monto) || 0;

    let subtotal = 0;
    for (let item of cart) {
      const productDB = await Product.findById(item.product._id);
      if (!productDB) {
        return res.send(`❌ El producto "${item.product.name}" ya no existe.`);
      }
      if (productDB.stock < item.quantity) {
        return res.send(`❌ Stock insuficiente para "${item.product.name}". Disponible: ${productDB.stock}`);
      }
      subtotal += productDB.pricePieza * item.quantity;
    }

    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    if (montoIngresado < total) {
      return res.send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="2; url=/self-checkout/payment" />
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body class="container mt-5 text-center">
            <div class="alert alert-danger">
              ❌ El monto ingresado no cubre el total.<br>
              Redirigiendo al pago...
            </div>
          </body>
        </html>
      `);
    }

    const cambio = montoIngresado - total;

    const processedItems = cart.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      priceAtSale: item.product.pricePieza
    }));

    const newSale = new Sale({
      items: processedItems,
      total,
      paymentMethod: metodo,
      pagoEfectivo: metodo === 'efectivo' ? montoIngresado : 0,
      pagoTarjeta: metodo === 'tarjeta' ? montoIngresado : 0,
      pagoTransferencia: metodo === 'transferencia' ? montoIngresado : 0,
      cambio,
      user: "68924aaf258ea1612e718dc4",
      status: 'finalizado'
    });

    await newSale.save();

    for (let item of cart) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    req.session.autoCart = [];

    const ticket = {
      fecha: newSale.date.toLocaleString('es-MX'),
      cart,
      subtotal,
      tax,
      total,
      metodo,
      montoIngresado,
      cambio
    };

    req.session.lastAutoTicket = ticket;
    req.session.ticketImpreso = false;

    res.redirect('/self-checkout/success');
  } catch (error) {
    console.error("❌ Error al procesar pago:", error);
    res.status(500).send(`Error al procesar el pago: ${error.message}`);
  }
};

// Vista de éxito post-pago
exports.mostrarExito = async (req, res) => {
  const ticket = req.session.lastAutoTicket;
  if (!ticket) return res.redirect('/self-checkout/products');

  if (!req.session.ticketImpreso) {
    await imprimirTicketAutoTxt(ticket);
    req.session.ticketImpreso = true;
  }

  res.render('self-checkout/success', { ticket });
};

// Generar QR del ticket
exports.generarQR = async (req, res) => {
  const ticket = req.session.lastAutoTicket;
  if (!ticket) return res.status(404).send('No hay ticket disponible');

  const ticketData = {
    fecha: ticket.fecha,
    productos: ticket.cart.map(i => ({
      nombre: i.product.name,
      cantidad: i.quantity,
      precio: i.product.pricePieza
    })),
    total: ticket.total,
    metodo: ticket.metodo,
    pagado: ticket.montoIngresado,
    cambio: ticket.cambio
  };

  try {
    const qrData = JSON.stringify(ticketData);
    const qrImage = await QRCode.toDataURL(qrData);
    res.send(`<img src="${qrImage}" style="width: 250px;" />`);
  } catch (err) {
    console.error('❌ Error generando QR:', err);
    res.status(500).send('Error generando QR');
  }
};

// Aumentar cantidad de producto
exports.aumentarCantidad = async (req, res) => {
  initCart(req);
  const id = req.params.id;

  try {
    const product = await Product.findById(id);
    if (!product || product.stock <= 0) return res.redirect('/self-checkout/cart');

    const index = req.session.autoCart.findIndex(item => item.product._id == id);
    if (index >= 0) {
      const currentQuantity = req.session.autoCart[index].quantity || 0;
      if (currentQuantity < product.stock) {
        req.session.autoCart[index].quantity += 1;
      }
    }
  } catch (error) {
    console.error('❌ Error al aumentar cantidad:', error);
  }

  res.redirect('/self-checkout/cart');
};

// Disminuir cantidad de producto
exports.disminuirCantidad = (req, res) => {
  initCart(req);
  const id = req.params.id;

  const index = req.session.autoCart.findIndex(item => item.product._id == id);
  if (index >= 0) {
    req.session.autoCart[index].quantity -= 1;
    if (req.session.autoCart[index].quantity <= 0) {
      req.session.autoCart.splice(index, 1);
    }
  }

  res.redirect('/self-checkout/cart');
};

// Contador del carrito (para UI)
exports.contarCarrito = (req, res) => {
  const cart = req.session.autoCart || [];
  const count = cart.reduce((acc, it) => acc + (it.quantity || 0), 0);
  res.json({ count });
};

// --- SUGERENCIAS (autocompletar) ---
exports.sugerirProductos = async (req, res) => {
  try {
    const qRaw = (req.query.q || '').trim();
    const cat = (req.query.cat || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '8', 10) || 8, 20);

    if (qRaw.length < 2) return res.json([]); // mínimo 2 letras

    const esc = escapeRegExp(qRaw);

    const filter = {
      stock: { $gt: 0 },
      $or: [
        { name: { $regex: esc, $options: 'i' } },
        { barcode: { $regex: esc, $options: 'i' } }
      ]
    };

    if (cat && cat !== 'all') {
      filter.category = cat;
    }

    const rows = await Product.find(filter)
      .select('name barcode pricePieza image stock')
      .collation({ locale: 'es', strength: 1, numericOrdering: true })
      .sort({ name: 1, _id: 1 }) // también ordenadas en sugerencias
      .limit(limit)
      .lean();

    const suggestions = rows.map(p => ({
      id: p._id,
      name: p.name,
      barcode: p.barcode,
      price: p.pricePieza,
      stock: p.stock,
      image: p.image
    }));

    res.json(suggestions);
  } catch (e) {
    console.error('❌ Error en sugerencias:', e);
    res.status(500).json([]);
  }
};
