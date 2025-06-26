#!/bin/bash

echo "Clonando el repositorio..."
git clone -b TONY-DATA-X-POS https://github.com/SmartSiteCompany/POS_CORE.git
cd POS_CORE

echo "Instalando dependencias del proyecto..."
npm install

echo "Verificando archivo .env..."
if [ ! -f .env ]; then
  echo "Archivo .env no encontrado. Por favor crea uno con tus variables de entorno."
else
  echo ".env encontrado."
fi

echo "Iniciando el proyecto..."
npm start
