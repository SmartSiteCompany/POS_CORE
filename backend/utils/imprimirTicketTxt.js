const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const imprimirTicketTxt = async (venta, impresora = "POS-58") => {
  try {
    const texto = `
      POS CORE
  ---------------------
  Fecha: ${new Date(venta.fecha).toLocaleString()}
  Cajero: ${venta.usuario?.name || "N/A"}
  ---------------------
${venta.productos?.map(i => `${i.nombre} x${i.cantidad} - $${i.precio.toFixed(2)}`).join('\n')}
  ---------------------
  Subtotal: $${venta.subtotal?.toFixed(2) || 0}
  Impuestos: $${venta.impuestos?.toFixed(2) || 0}
  Total: $${venta.total?.toFixed(2) || 0}
  Pagado: $${venta.pagado?.toFixed(2) || 0}
  Cambio: $${venta.cambio?.toFixed(2) || 0}
  ---------------------
  ¡Gracias por su compra!
`;

    const filePath = path.join(__dirname, "ticket.txt");
    fs.writeFileSync(filePath, texto, "utf8");

    const comando = `Start-Process -FilePath notepad.exe -ArgumentList '/p','"${filePath}"' -NoNewWindow -Wait`;

    exec(`powershell -Command "${comando}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error al imprimir:", error.message);
      } else {
        console.log("✅ Ticket enviado a la impresora");
      }
    });
  } catch (err) {
    console.error("❌ Error general al imprimir:", err.message);
  }
};

module.exports = imprimirTicketTxt;
