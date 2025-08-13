// controllers/dashboardController.js
const Sale = require('../models/Sale');
const Product = require('../models/Product');

exports.getDashboard = async (req, res) => {
  try {
    const tz = 'America/Mexico_City';

    // RANGOS
    const now = new Date();
    const start30d = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); // últimos 30 días
    const start14d = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000); // últimas 2 semanas

    // ======= Totales "lifetime" (no rompemos tu dashboard actual) =======
    const [ventasTotales, ingresosAgg, metodosAgg, topAgg, pendingCount] = await Promise.all([
      Sale.countDocuments({ status: 'finalizado' }),
      Sale.aggregate([
        { $match: { status: 'finalizado' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      // Distribución de métodos (últimos 30 días para que sea “reciente”)
      Sale.aggregate([
        { $match: { status: 'finalizado', date: { $gte: start30d } } },
        { $group: { _id: '$paymentMethod', c: { $sum: 1 } } }
      ]),
      // Top productos por unidades (lifetime)
      Sale.aggregate([
        { $match: { status: 'finalizado' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalVendido: { $sum: '$items.quantity' } } },
        { $sort: { totalVendido: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'prod'
          }
        }
      ]),
      // Tickets pendientes (para el header)
      Sale.countDocuments({ status: 'pendiente' })
    ]);

    const ingresosTotales = ingresosAgg[0]?.total || 0;

    const productosMasVendidos = topAgg.map(t => ({
      nombre: t.prod && t.prod[0] ? (t.prod[0].name || 'Producto') : 'Producto',
      totalVendido: t.totalVendido || 0
    }));

    const metodosPago = {
      efectivo: 0, tarjeta: 0, transferencia: 0, mixto: 0
    };
    metodosAgg.forEach(m => {
      const k = String(m._id || '').toLowerCase();
      if (k && metodosPago[k] !== undefined) metodosPago[k] = m.c;
    });

    // ======= Series temporales (para “Análisis temporal”) =======

    // Ventas por día (últimos 30)
    const dailyAgg = await Sale.aggregate([
      { $match: { status: 'finalizado', date: { $gte: start30d } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz }
          },
          ingresos: { $sum: '$total' },
          ventas: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const seriesDaily = {
      labels: dailyAgg.map(d => d._id),
      ingresos: dailyAgg.map(d => d.ingresos),
      ventas: dailyAgg.map(d => d.ventas)
    };

    // Ingresos por hora (acumulado últimas 2 semanas)
    // Más compatible: derivamos la hora con $dateToString("%H") y luego parseamos
    const hourlyAgg = await Sale.aggregate([
      { $match: { status: 'finalizado', date: { $gte: start14d } } },
      {
        $addFields: {
          hourStr: { $dateToString: { format: '%H', date: '$date', timezone: tz } }
        }
      },
      {
        $group: {
          _id: '$hourStr',
          ingresos: { $sum: '$total' },
          ventas: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    // Normalizamos a 0..23 y arrays ordenados
    const hourMap = new Map(hourlyAgg.map(h => [parseInt(h._id, 10), h]));
    const labelsH = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
    const seriesHourly = {
      labels: labelsH,
      ingresos: labelsH.map(h => {
        const k = parseInt(h, 10);
        return hourMap.get(k)?.ingresos || 0;
      }),
      ventas: labelsH.map(h => {
        const k = parseInt(h, 10);
        return hourMap.get(k)?.ventas || 0;
      })
    };

    // Ingresos por día de la semana (0=Domingo…6=Sábado)
    const dowAgg = await Sale.aggregate([
      { $match: { status: 'finalizado', date: { $gte: start30d } } },
      {
        $addFields: {
          dow: { $dateToString: { format: '%w', date: '$date', timezone: tz } } // "0".."6"
        }
      },
      {
        $group: {
          _id: '$dow',
          ingresos: { $sum: '$total' },
          ventas: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const dowNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const dowMap = new Map(dowAgg.map(d => [parseInt(d._id, 10), d]));
    const seriesDOW = {
      labels: dowNames,
      ingresos: dowNames.map((_, i) => dowMap.get(i)?.ingresos || 0),
      ventas: dowNames.map((_, i) => dowMap.get(i)?.ventas || 0)
    };

    // Render
    res.render('dashboard/index', {
      user: req.user,
      showBack: false,          // oculta "Volver" aquí (como pediste)
      pendingCount,             // badge de pendientes en el header
      totalVentas: ventasTotales,
      ingresosTotales,
      productosMasVendidos,
      metodosPago,
      // nuevas series
      seriesDaily,
      seriesHourly,
      seriesDOW
    });
  } catch (err) {
    console.error('❌ Error getDashboard:', err);
    res.status(500).send('Error al cargar dashboard');
  }
};
