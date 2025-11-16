#!/bin/bash

echo "=========================================="
echo "  Instalación de Zello PWA en Ubuntu 22"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Por favor ejecuta este script como root (sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Actualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}2. Instalando Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js ya está instalado"
fi

echo "Node.js versión: $(node --version)"
echo "npm versión: $(npm --version)"

echo -e "${YELLOW}3. Instalando PM2 globalmente...${NC}"
npm install -g pm2

echo -e "${YELLOW}4. Instalando dependencias del proyecto...${NC}"
npm install

echo -e "${YELLOW}5. Creando directorio de uploads...${NC}"
mkdir -p public/uploads
chmod 755 public/uploads

echo -e "${YELLOW}6. ¿Deseas instalar Nginx? (s/n)${NC}"
read -p "Respuesta: " install_nginx

if [ "$install_nginx" = "s" ] || [ "$install_nginx" = "S" ]; then
    echo -e "${YELLOW}Instalando Nginx...${NC}"
    apt install -y nginx

    echo -e "${YELLOW}Por favor ingresa tu dominio (o presiona Enter para usar localhost):${NC}"
    read -p "Dominio: " domain

    if [ -z "$domain" ]; then
        domain="localhost"
    fi

    # Crear configuración de Nginx
    cat > /etc/nginx/sites-available/zello-pwa << EOF
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

    # Activar sitio
    ln -sf /etc/nginx/sites-available/zello-pwa /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Verificar configuración
    nginx -t
    systemctl restart nginx
    systemctl enable nginx

    echo -e "${GREEN}Nginx configurado exitosamente${NC}"

    echo -e "${YELLOW}¿Deseas instalar certificado SSL con Let's Encrypt? (s/n)${NC}"
    read -p "Respuesta: " install_ssl

    if [ "$install_ssl" = "s" ] || [ "$install_ssl" = "S" ]; then
        apt install -y certbot python3-certbot-nginx
        certbot --nginx -d $domain
        echo -e "${GREEN}SSL configurado exitosamente${NC}"
    fi
fi

echo -e "${YELLOW}7. Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

echo -e "${YELLOW}8. Iniciando aplicación con PM2...${NC}"
pm2 start server/index.js --name zello-pwa
pm2 startup
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "  ✓ Instalación completada exitosamente"
echo "==========================================${NC}"
echo ""
echo "La aplicación está corriendo en:"
if [ "$domain" != "localhost" ]; then
    echo "  - http://$domain"
    if [ "$install_ssl" = "s" ] || [ "$install_ssl" = "S" ]; then
        echo "  - https://$domain"
    fi
else
    echo "  - http://localhost:3000"
fi
echo ""
echo "Comandos útiles:"
echo "  pm2 status           - Ver estado de la aplicación"
echo "  pm2 logs zello-pwa   - Ver logs"
echo "  pm2 restart zello-pwa - Reiniciar"
echo "  pm2 stop zello-pwa    - Detener"
echo ""
echo "Para generar los iconos PWA, visita:"
echo "  http://$domain/generate-icons.html"
echo ""
