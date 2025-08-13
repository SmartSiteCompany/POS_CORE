const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const imprimirCorteCajaTxt = async ({ ventas, usuario, montoInicial, total, fecha, totalConMontoInicial, totalesPorMetodo }) => {
  try {
    const texto = `
        POS CORE - CORTE DE CAJA
----------------------------------------
Fecha: ${new Date(fecha).toLocaleString()}
Usuario: ${usuario.name || 'N/A'}
----------------------------------------
${ventas.map(v => `Venta ${v._id} - $${v.total.toFixed(2)}`).join('\n')}
----------------------------------------
Monto Inicial: $${montoInicial.toFixed(2)}
Total Ventas: $${total.toFixed(2)}
TOTAL CON MONTO INICIAL: $${totalConMontoInicial?.toFixed(2) || (total + montoInicial).toFixed(2)}

Métodos de Pago:
EFECTIVO: $${totalesPorMetodo.efectivo.toFixed(2)}
TARJETA: $${totalesPorMetodo.tarjeta.toFixed(2)}
TRANSFERENCIA: $${totalesPorMetodo.transferencia.toFixed(2)}
MIXTO: $${totalesPorMetodo.mixto.toFixed(2)}

¡Gracias por su esfuerzo hoy!
`;

    const filePath = path.join(__dirname, "corte-caja.txt");
    fs.writeFileSync(filePath, texto, "utf8");

    const comando = `Start-Process -FilePath notepad.exe -ArgumentList '/p','"${filePath}"' -NoNewWindow -Wait`;

    exec(`powershell -Command "${comando}"`, (error) => {
      if (error) {
        console.error("❌ Error al imprimir corte de caja:", error.message);
      } else {
        console.log("✅ Corte de caja enviado a la impresora");
      }
    });
  } catch (err) {
    console.error("❌ Error general al imprimir corte de caja:", err.message);
  }
};

module.exports = imprimirCorteCajaTxt;
