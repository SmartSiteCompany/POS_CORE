POS_CORE – Instrucciones rápidas de instalación (Windows)
1. Instalar Node.js
Abre el instalador node-v18...msi desde la USB.
Acepta todo en Siguiente → Instalar.
Verifica en PowerShell: node -v
2. Instalar MongoDB
1.	Localizar el instalador descargado y dar clic derecho → Instalar.
2.	En el asistente de instalación:
o	Presionar Next.
o	Aceptar los Términos y Condiciones.
o	Seleccionar Complete (instalación completa).
o	Marcar la opción Install MongoDB as a Service.
o	Dar Next para continuar.
o	Confirmar la instalación de MongoDB Compass (incluido en el instalador).
o	Dar clic en Install.
3.	Al finalizar, presionar Finish.

Configuración de MongoDB en Windows
1.	Abrir el Explorador de Archivos e ir a:
C:\Program Files\MongoDB\Server\<versión>\bin
2.	Copiar la ruta completa de la carpeta bin.
3.	Configurar la variable de entorno:
o	Dar clic derecho en Este Equipo → Propiedades.
o	Seleccionar Configuración avanzada del sistema.
o	Ir a Variables de entorno.
o	Editar la variable Path y agregar la ruta copiada.
o	Guardar cambios con Aceptar.
4.	Crear las carpetas necesarias para la base de datos:
o	En C:\ crear una carpeta llamada data.
o	Dentro de data, crear otra carpeta llamada db.

Verificación de instalación
1.	Abrir CMD.
2.	Ejecutar el comando:
3.	mongod --version
→ Debería mostrar la versión instalada.
4.	Limpiar la terminal con:
5.	cls
6.	Iniciar el servidor de MongoDB con:
7.	mongod

Instalación de MongoDB Shell
1.	Regresar a la página de MongoDB.
2.	Ir al apartado Tools y descargar MongoDB Shell (mongosh).
3.	Descomprimir el archivo descargado.
4.	Mover la carpeta descomprimida dentro de la carpeta de MongoDB.
5.	Copiar la ruta completa de la carpeta bin dentro de mongosh.
6.	Agregarla a las Variables de entorno (igual que en el paso 3).

Conexión a MongoDB
7.	Abrir un nuevo CMD.
8.	Ejecutar:
9.	mongosh
3. Copiar el proyecto
Copia la carpeta POS_CORE desde la USB a tu disco, por ejemplo: C:\POS_CORE\
4. Crear archivo .env
En C:\POS_CORE\backend\ crea un archivo llamado .env con este contenido mínimo:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pos_core
SESSION_SECRET=un-secreto
5. Instalar dependencias
Abre PowerShell en la carpeta del proyecto y escribe:
cd C:\POS_CORE\backend
npm ci
(Si no hay internet, descomprime node_modules.zip aquí mismo).
6. Iniciar el sistema
En la misma carpeta ejecuta: npm start
Luego abre en tu navegador: http://localhost:5000
7. Crear usuario administrador
Ejecuta este comando una vez (o el que tenga definido tu proyecto):
node seed-admin.js

