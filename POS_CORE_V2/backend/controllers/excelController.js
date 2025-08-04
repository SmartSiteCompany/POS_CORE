const XLSX = require('xlsx');
const Product = require('../models/Product');

// Función para limpiar strings numéricos (ej: "$ 1,000.50" → 1000.5)
function cleanNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(
      value.replace(/\$/g, '').replace(/,/g, '').trim()
    ) || 0;
  }
  return 0;
}

// ✅ IMPORTAR Excel
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/products?importError=1');
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const products = data.map(row => ({
      barcode: String(row['Código']).trim(),
      name: row['Descripción del producto'] || 'Producto sin nombre',
      cost: cleanNumber(row['Costo']),
      pricePieza: cleanNumber(row['Precio Pieza']),
      minPieza: parseInt(row['Cantidad minima - Pieza']) || 1,
      priceMayoreo: cleanNumber(row['Precio Mayoreo']),
      minMayoreo: parseInt(row['Cantidad minima - Mayoreo']) || 1,
      pricePaquete: cleanNumber(row['Precio Paquete']),
      minPaquete: parseInt(row['Cantidad minima - Paquete']) || 1,
      price4: cleanNumber(row['Precio Precio 4']),
      min4: parseInt(row['Cantidad minima - Precio 4']) || 1,
      price5: cleanNumber(row['Precio Precio 5']),
      min5: parseInt(row['Cantidad minima - Precio 5']) || 1,
      stock: parseInt(row['Existencia']) || 0,
      stockMin: parseInt(row['Inv. Minimo']) || 0,
      stockMax: parseInt(row['Inv. Máximo']) || 0,
      category: row['Departamento'] || 'Sin categoría'
    }));

    for (const product of products) {
      await Product.findOneAndUpdate(
        { barcode: product.barcode },
        product,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.redirect('/products?importSuccess=1');
  } catch (error) {
    console.error('Error al importar Excel:', error);
    res.redirect('/products?importError=1');
  }
};

// ✅ EXPORTAR Excel
exports.exportExcel = async (req, res) => {
  try {
    const products = await Product.find().lean();

    const data = products.map(p => ({
      'Código': p.barcode,
      'Descripción del producto': p.name,
      'Costo': p.cost,
      'Precio Pieza': p.pricePieza,
      'Cantidad minima - Pieza': p.minPieza,
      'Precio Mayoreo': p.priceMayoreo,
      'Cantidad minima - Mayoreo': p.minMayoreo,
      'Precio Paquete': p.pricePaquete,
      'Cantidad minima - Paquete': p.minPaquete,
      'Precio Precio 4': p.price4,
      'Cantidad minima - Precio 4': p.min4,
      'Precio Precio 5': p.price5,
      'Cantidad minima - Precio 5': p.min5,
      'Existencia': p.stock,
      'Inv. Minimo': p.stockMin,
      'Inv. Máximo': p.stockMax,
      'Departamento': p.category
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=productos.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).send('Error al exportar Excel.');
  }
};
