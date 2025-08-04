const Config = require('../models/Config');

// Mostrar formulario
exports.getConfig = async (req, res) => {
  const config = await Config.findOne();
  res.render('config/form', { config });
};

// Guardar o actualizar
exports.saveConfig = async (req, res) => {
  const { businessName, ticketName, taxRate } = req.body;

  let config = await Config.findOne();

  if (config) {
    config.businessName = businessName;
    config.ticketName = ticketName;
    config.taxRate = taxRate;
    await config.save();
  } else {
    await Config.create({ businessName, ticketName, taxRate });
  }

  res.render('config/form', {
    config: await Config.findOne(),
    successMessage: '✅ Configuración guardada correctamente'
  });
};
