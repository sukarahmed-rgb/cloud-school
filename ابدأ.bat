@echo off
title Cloud School
echo.
echo ================================
echo   Cloud School - تشغيل المشروع
echo ================================
echo.

echo 🔒 تشغيل الخادم (يخدم الموقع + API معاً)...
start "Cloud School" "C:\Program Files\nodejs\node.exe" "%~dp0proxy\server.js"

echo.
echo ================================
echo   ✅ تم!
echo.
echo   الموقع:          http://localhost:8081
echo ================================
echo.
echo ⚠️  لا تغلق هالنافذة
echo    أقفل النافذة الصغيرة عشان توقف الخدمة
echo.
pause
