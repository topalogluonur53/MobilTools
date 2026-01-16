@echo off
chcp 65001 >nul
title MobilTools Başlatıcı

echo ╔════════════════════════════════════════╗
echo ║     MobilTools Uygulama Başlatıcı     ║
echo ╚════════════════════════════════════════╝
echo.

REM Backend dizinine git ve sunucuyu başlat
echo [1/2] Backend sunucusu başlatılıyor (Waitress)...
cd /d "%~dp0backend"
start "MobilTools Backend" cmd /k ".\venv\Scripts\waitress-serve --listen=0.0.0.0:8001 --threads=8 --channel-timeout=300 --max-request-body-size=104857600 config.wsgi:application"

REM 3 saniye bekle
timeout /t 3 /nobreak >nul

REM Frontend dizinine git ve sunucuyu başlat
echo [2/2] Frontend sunucusu başlatılıyor...
cd /d "%~dp0frontend"
start "MobilTools Frontend" cmd /k "set NODE_NO_DEPRECATION=1 && npm run dev -- -p 3001"

echo.
echo ✓ Tüm sunucular başlatıldı!
echo.
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3001
echo Cloudflare: https://mobil.onurtopaloglu.uk
echo.
echo Sunucuları durdurmak için açılan terminal pencerelerini kapatın.
echo.
pause
    