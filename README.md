
🛠️EquipoCore

POS_CORE
POS BETA

REQUERIMIENTOS PARA INSTALAR DATA-X-POS En UBUNTU 24.04 

npm install dotenv init -y

npm install express

npm install express mongoose dotenv ejs

npm install cors

npm install express-session

npm install bcryptjs

npm install jsonwebtoken

npm install express-validator

npm install pdfkit

🛠️Requerimientos:
Instalación de Node 

Ve al sitio oficial: https://nodejs.org/
descarga el archivo msi, sigue los pasos del instalador
Instalar Mongodb

npm install dotenv init -y

npm install express

npm install express mongoose dotenv ejs

npm install cors

npm install express-session

npm install bcryptjs

npm install jsonwebtoken

npm install express-validator

npm install pdfkit

🛠️ Pasos para instalar MongoDB 7.0 en Ubuntu 24.04

curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

sudo apt update

sudo apt install -y mongodb-org

sudo systemctl start mongod

sudo systemctl enable mongod

sudo systemctl status mongod

mongod --version

🛠️ Instalar Mongosh y Mongo Compas 

mongosh
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt update

sudo apt install -y mongodb-org

sudo systemctl start mongod

sudo systemctl status mongod

mongosh

🛠️---Compas---
wget https://downloads.mongodb.com/compass/mongodb-compass_1.35.0_amd64.deb

sudo dpkg -i mongodb-compass_1.35.0_amd64.deb

sudo apt --fix-broken install

mongodb-compass








