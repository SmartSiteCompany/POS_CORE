const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

async function imprimirTicketAuto(ticket) {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'usb',
      width: 48,
      removeSpecialCharacters: false
    });

    printer.alignCenter();
    printer.println("TIENDA AUTOSERVICIO");
    printer.println("🧾 Ticket de compra");
    printer.drawLine();

    ticket.cart.forEach(item => {
      const name = item.product.name;
      const qty = item.quantity;
      const price = item.product.pricePieza.toFixed(2);
      const total = (qty * item.product.pricePieza).toFixed(2);
      printer.println(`${name}`);
      printer.println(` ${qty} x $${price} = $${total}`);
    });

    printer.drawLine();
    printer.println(`Total: $${ticket.total.toFixed(2)}`);
    printer.println(`Pagado: $${ticket.montoIngresado.toFixed(2)}`);
    printer.println(`Cambio: $${ticket.cambio.toFixed(2)}`);
    printer.println(`Método: ${ticket.metodo}`);
    printer.println(ticket.fecha);
    printer.newLine();
    printer.println("¡Gracias por su compra!");
    printer.cut();

    const success = await printer.execute();
    return success;
  } catch (error) {
    console.error("❌ Error al imprimir ticket:", error);
    return false;
  }
}

module.exports = imprimirTicketAuto;
