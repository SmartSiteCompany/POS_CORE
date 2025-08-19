POS_CORE – Instrucciones rápidas de instalación (Windows)

1.  Instalar Node.js
    -   Abre el instalador node-v18…msi desde la USB.
    -   Acepta todo en Siguiente → Instalar.
    -   Verifica en PowerShell: node -v
2.  Instalar MongoDB
    -   Abre mongodb…msi desde la USB.
    -   Instálalo como servicio de Windows (opción por defecto).
    -   Verifica que está corriendo: mongosh
3.  Copiar el proyecto
    -   Copia la carpeta POS_CORE desde la USB a tu disco, por ejemplo:
        C:_CORE
4.  Crear archivo .env
    -   En C:_CORE crea un archivo llamado .env con este contenido
        mínimo:

        PORT=5000 MONGO_URI=mongodb://127.0.0.1:27017/pos_core
        SESSION_SECRET=un-secreto
5.  Instalar dependencias
    -   Abre PowerShell en la carpeta del proyecto y escribe: cd C:_CORE
        npm ci
    -   (Si no hay internet, descomprime node_modules.zip aquí mismo).
6.  Iniciar el sistema
    -   En la misma carpeta ejecuta: npm start
    -   Luego abre en tu navegador: http://localhost:5000
7.  Crear usuario administrador
    -   Ejecuta este comando una vez (o el que tenga definido tu
        proyecto): node seed-admin.js