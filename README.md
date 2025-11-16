# Zello PWA - Walkie-Talkie Web

Aplicación web progresiva (PWA) estilo Zello con comunicación en tiempo real, Push-to-Talk (PTT), y chat multimedia.

## Características

- **Push-to-Talk (PTT)**: Comunicación de voz en tiempo real estilo walkie-talkie
- **Chat de texto**: Mensajería instantánea en canales
- **Multimedia**: Envío de imágenes, GIFs y videos
- **Canales**: Múltiples canales de comunicación
- **PWA**: Instalable en móviles y escritorio
- **Diseño moderno**: Interfaz oscura estilo WhatsApp/Telegram
- **Responsive**: Funciona en todos los dispositivos
- **Tiempo real**: Comunicación instantánea con WebSockets

## Tecnologías

**Backend:**
- Node.js + Express
- Socket.io (WebSockets)
- Multer (subida de archivos)

**Frontend:**
- HTML5 + CSS3
- JavaScript (Vanilla)
- Web Audio API
- MediaRecorder API
- PWA (Service Workers + Manifest)

## Instalación en Ubuntu 22

### 1. Instalar Node.js

```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 2. Clonar o subir el proyecto

```bash
# Si tienes el proyecto en tu VPS
cd /var/www/
# O la ruta donde quieras instalar

# Asegúrate de que los archivos estén en el directorio
ls -la
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar puerto (opcional)

Por defecto usa el puerto 3000. Para cambiarlo:

```bash
export PORT=3000
# O edita server/index.js
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

### 6. Ejecutar en producción con PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar la aplicación
pm2 start server/index.js --name zello-pwa

# Configurar inicio automático
pm2 startup
pm2 save

# Otros comandos útiles
pm2 status          # Ver estado
pm2 logs zello-pwa  # Ver logs
pm2 restart zello-pwa  # Reiniciar
pm2 stop zello-pwa     # Detener
```

### 7. Configurar Nginx como proxy reverso

```bash
# Instalar Nginx
sudo apt install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/zello-pwa
```

Contenido del archivo:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # Cambia esto

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Activar la configuración:

```bash
sudo ln -s /etc/nginx/sites-available/zello-pwa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar SSL con Let's Encrypt (HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya configurada)
sudo certbot renew --dry-run
```

### 9. Configurar Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

## Generar Iconos PWA

1. Abre en el navegador: `http://localhost:3000/generate-icons.html`
2. Se generarán todos los iconos automáticamente
3. Haz clic derecho en cada imagen y guárdala en `public/icons/`
4. Nombres: `icon-72.png`, `icon-96.png`, `icon-128.png`, etc.

O usa una herramienta online como [PWA Asset Generator](https://www.pwabuilder.com/).

## Uso de la aplicación

### Ingresar
1. Abre la aplicación en tu navegador
2. Ingresa tu nombre de usuario
3. Serás conectado al canal "General"

### Push-to-Talk
1. Mantén presionado el botón verde grande
2. Habla mientras lo mantienes presionado
3. Suelta para enviar el mensaje de voz

### Chat de texto
1. Escribe en el campo de texto
2. Presiona Enter o el botón de enviar

### Enviar multimedia
1. Haz clic en el botón de clip 📎
2. Selecciona una imagen o video
3. Agrega un comentario opcional
4. Envía

### Cambiar de canal
1. Haz clic en el botón de lista (☰)
2. Selecciona un canal existente
3. O crea uno nuevo

### Instalar como app
1. En Chrome/Edge: Clic en el icono de instalación en la barra de direcciones
2. En iOS Safari: Compartir → Agregar a pantalla de inicio
3. En Android Chrome: Menú → Instalar aplicación

## Estructura del proyecto

```
zello-pwa/
├── server/
│   └── index.js          # Servidor Express + Socket.io
├── public/
│   ├── index.html        # HTML principal
│   ├── manifest.json     # Manifest PWA
│   ├── sw.js            # Service Worker
│   ├── css/
│   │   └── style.css    # Estilos
│   ├── js/
│   │   └── app.js       # Lógica frontend
│   ├── icons/           # Iconos PWA (generar)
│   └── uploads/         # Archivos subidos
├── package.json
└── README.md
```

## Configuración avanzada

### Cambiar límites de archivos

Edita `server/index.js`:

```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB (cambiar aquí)
  }
});
```

### Persistencia de datos

Actualmente los mensajes se almacenan en memoria. Para persistencia:

1. **SQLite**: Ligero, sin configuración
```bash
npm install better-sqlite3
```

2. **MongoDB**: Más robusto
```bash
sudo apt install mongodb
npm install mongoose
```

### Variables de entorno

Crea un archivo `.env`:

```env
PORT=3000
NODE_ENV=production
MAX_FILE_SIZE=10485760
```

Instala dotenv:
```bash
npm install dotenv
```

## Solución de problemas

### El micrófono no funciona
- Verifica que uses HTTPS (requerido para acceso al micrófono)
- Otorga permisos en el navegador

### WebSocket no conecta
- Verifica que Nginx esté configurado correctamente para WebSockets
- Revisa los logs: `pm2 logs zello-pwa`

### Archivos no se suben
- Verifica permisos del directorio `public/uploads/`
```bash
chmod 755 public/uploads/
```

### Puerto en uso
```bash
# Ver qué usa el puerto 3000
sudo lsof -i :3000

# Cambiar puerto en server/index.js o usar variable de entorno
export PORT=3001
```

## Mejoras futuras

- [ ] Base de datos para persistencia
- [ ] Autenticación de usuarios
- [ ] Canales privados con contraseña
- [ ] Historial de mensajes paginado
- [ ] Compartir ubicación
- [ ] Videollamadas WebRTC
- [ ] Encriptación end-to-end
- [ ] Modo offline mejorado
- [ ] Notificaciones push del servidor

## Licencia

MIT

## Soporte

Para problemas o preguntas, revisa los logs:

```bash
pm2 logs zello-pwa
```

O revisa el navegador:
- F12 → Console para ver errores de JavaScript
- F12 → Network para ver problemas de conexión
