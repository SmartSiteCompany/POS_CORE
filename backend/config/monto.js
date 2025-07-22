let montoInicial = 0;

exports.setMontoInicial = (monto) => {
    montoInicial = parseFloat(monto) || 0; // Asegurar que el valor sea numérico
};

exports.getMontoInicial = () => montoInicial;
