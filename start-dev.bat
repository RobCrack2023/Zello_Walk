@echo off
echo ==========================================
echo   Iniciando Zello PWA en modo desarrollo
echo ==========================================
echo.

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado
    echo Por favor descarga e instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Verificar si las dependencias están instaladas
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias...
    call npm install
    echo.
)

REM Crear carpeta de uploads si no existe
if not exist "public\uploads\" (
    mkdir public\uploads
)

echo [INFO] Iniciando servidor en http://localhost:3000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Iniciar el servidor
node server/index.js

pause
