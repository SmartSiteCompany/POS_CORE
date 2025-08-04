const PDFDocument = require('pdfkit');
const Config = require('../models/Config'); // ✅ Agregado

exports.downloadTicket = async (req, res) => {
  const type = req.query.type || 'pdf';
  const ticket = req.session.lastTicket;

  if (!ticket) return res.status(400).send('No hay ticket disponible');

  if (type === 'json') {
    res.setHeader('Content-disposition', 'attachment; filename=ticket.json');
    res.setHeader('Content-type', 'application/json');
    return res.send(JSON.stringify(ticket, null, 2));
  }

  const config = await Config.findOne(); // ✅ Obtener configuración

  const doc = new PDFDocument();
  res.setHeader('Content-disposition', 'attachment; filename=ticket.pdf');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).text(`🧾 ${config?.ticketName || 'Ticket de Compra'}`, { align: 'center' });
  doc.fontSize(14).text(config?.businessName || 'Negocio', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Fecha: ${ticket.fecha}`);
  doc.moveDown();

  doc.text('Productos:');
  ticket.cart.forEach(item => {
    doc.text(`- ${item.name} x${item.quantity} @ $${item.priceAtSale.toFixed(2)} = $${(item.priceAtSale * item.quantity).toFixed(2)}`);
  });

  doc.moveDown();
  doc.text(`Subtotal: $${ticket.subtotal.toFixed(2)}`);
  doc.text(`Impuestos (${config?.taxRate || 0}%): $${ticket.tax.toFixed(2)}`);
  doc.text(`Total: $${ticket.total.toFixed(2)}`);

  doc.moveDown().text('Pagos:');
  if (ticket.pagoEfectivo > 0) doc.text(`Efectivo: $${ticket.pagoEfectivo.toFixed(2)}`);
  if (ticket.pagoTarjeta > 0) doc.text(`Tarjeta: $${ticket.pagoTarjeta.toFixed(2)}`);
  if (ticket.pagoTransferencia > 0) doc.text(`Transferencia: $${ticket.pagoTransferencia.toFixed(2)}`);

  const totalPagado = (ticket.pagoEfectivo || 0) + (ticket.pagoTarjeta || 0) + (ticket.pagoTransferencia || 0);
  doc.text(`Total recibido: $${totalPagado.toFixed(2)}`);
  doc.text(`Cambio: $${ticket.cambio.toFixed(2)}`);

  doc.end();
};
