const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const imprimirTicketAutoTxt = async (ticket, impresora = "POS-58") => {
  try {
    const texto = `
      POS CORE
  -------------------------
  Fecha: ${ticket.fecha}
  -------------------------
${ticket.cart.map(i => `${i.product.name} x${i.quantity} - $${(i.product.pricePieza * i.quantity).toFixed(2)}`).join('\n')}
  -------------------------
  Subtotal: $${ticket.subtotal.toFixed(2)}
  Impuestos: $${ticket.tax.toFixed(2)}
  Total: $${ticket.total.toFixed(2)}
  Pagado: $${ticket.montoIngresado.toFixed(2)}
  Cambio: $${ticket.cambio.toFixed(2)}
  -------------------------
  ¡Gracias por su compra!
`;

    const filePath = path.join(__dirname, "ticketAuto.txt");
    fs.writeFileSync(filePath, texto, "utf8");

    const comando = `Start-Process -FilePath notepad.exe -ArgumentList '/p','"${filePath}"' -NoNewWindow -Wait`;

    exec(`powershell -Command "${comando}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error al imprimir:", error.message);
      } else {
        console.log("✅ Ticket autocobro enviado a la impresora");
      }
    });
  } catch (err) {
    console.error("❌ Error general al imprimir ticket auto:", err.message);
  }
};

module.exports = imprimirTicketAutoTxt;
