# Inicio Rápido

## Desarrollo local (Windows)

1. Instala Node.js desde https://nodejs.org/
2. Doble clic en `start-dev.bat`
3. Abre http://localhost:3000

## Desarrollo local (Linux/Mac)

```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Instalación en Ubuntu 22 VPS

```bash
# Subir el proyecto a tu VPS
# Luego ejecutar:

chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

El script automático instalará:
- Node.js
- Dependencias del proyecto
- PM2 (gestor de procesos)
- Nginx (opcional)
- SSL con Let's Encrypt (opcional)

## Manual rápido

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## Generar iconos PWA

1. Abre en el navegador: `/generate-icons.html`
2. Descarga todos los iconos generados
3. Guárdalos en `public/icons/`

## Primeros pasos

1. **Ingresar**: Escribe tu nombre de usuario
2. **Hablar**: Mantén presionado el botón verde
3. **Chat**: Escribe en el campo de texto
4. **Multimedia**: Clic en 📎 para adjuntar
5. **Canales**: Clic en ☰ para cambiar de canal

## Problemas comunes

**El micrófono no funciona:**
- Usa HTTPS (el navegador requiere conexión segura)
- Otorga permisos cuando el navegador lo solicite

**No conecta al servidor:**
- Verifica que el servidor esté corriendo
- Revisa el puerto (por defecto 3000)

**Archivos no se suben:**
- Verifica que exista la carpeta `public/uploads/`
- Dale permisos: `chmod 755 public/uploads/`

## Más información

Ver `README.md` para documentación completa.
