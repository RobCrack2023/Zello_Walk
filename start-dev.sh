#!/bin/bash

echo "=========================================="
echo "  Iniciando Zello PWA en modo desarrollo"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js no está instalado${NC}"
    echo "Por favor instala Node.js desde: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}Node.js version: $(node --version)${NC}"
echo -e "${GREEN}npm version: $(npm --version)${NC}"
echo ""

# Verificar si las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Instalando dependencias...${NC}"
    npm install
    echo ""
fi

# Crear carpeta de uploads si no existe
if [ ! -d "public/uploads" ]; then
    mkdir -p public/uploads
    chmod 755 public/uploads
fi

echo -e "${GREEN}[INFO] Iniciando servidor en http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener el servidor${NC}"
echo ""

# Iniciar el servidor
node server/index.js
