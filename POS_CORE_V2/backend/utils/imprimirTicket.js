const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

async function imprimirTicket(ticket) {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'usb'
    });

    printer.alignCenter();
    printer.println("TICKET DE COMPRA");
    printer.drawLine();

    ticket.cart.forEach(item => {
      printer.println(`${item.name} x${item.quantity} $${item.priceAtSale.toFixed(2)}`);
    });

    printer.drawLine();
    printer.println(`Total: $${ticket.total.toFixed(2)}`);
    printer.println(`Pagado: $${(ticket.pagoEfectivo + ticket.pagoTarjeta + ticket.pagoTransferencia).toFixed(2)}`);
    printer.println(`Cambio: $${ticket.cambio.toFixed(2)}`);
    printer.println(ticket.fecha);
    printer.cut();

    const success = await printer.execute();
    return success;
  } catch (error) {
    console.error('❌ Error al imprimir ticket:', error);
    return false;
  }
}

module.exports = imprimirTicket;
