#!/bin/bash

echo "Instalando dependencias del sistema"
sudo apt update && sudo apt install -y \
  git \
  curl \
  nodejs \
  npm \
  mongodb \
  redis-server \
  build-essential

echo "Dependencias del sistema instaladas"