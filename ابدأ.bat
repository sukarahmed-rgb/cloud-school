@echo off
title Cloud School
echo.
echo ================================
echo   Cloud School - تشغيل المشروع
echo ================================
echo.

echo 🔒 1. تشغيل الخادم الوسيط (Proxy Server)...
start "Proxy" "C:\Program Files\nodejs\node.exe" "%~dp0proxy\server.js"
timeout /t 3 /norestart >nul

echo 🌐 2. تشغيل الموقع (Dev Server)...
start "Live Server" "C:\Program Files\nodejs\node.exe" "%~dp0node_modules\live-server\live-server.js" "%~dp0" --port=8080

echo.
echo ================================
echo   ✅ تم!
echo.
echo   الموقع:          http://127.0.0.1:8080
echo   الخادم الوسيط:   http://localhost:3001
echo ================================
echo.
echo ⚠️  لا تغلق هالنافذة
echo    أقفل النافذتين الصغيرتين عشان توقف الخدمات
echo.
pause
