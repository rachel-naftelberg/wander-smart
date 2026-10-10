@echo off
title WanderSmart - Vienna Travel Companion
echo =======================================================
echo    WanderSmart (טריפ-מייט) - אפליקציית הטיולים שלך
echo =======================================================
cd /d "%~dp0"

if exist "%USERPROFILE%\.gemini\antigravity\scratch\node\node-v20.12.2-win-x64\node.exe" (
  set PATH=%USERPROFILE%\.gemini\antigravity\scratch\node\node-v20.12.2-win-x64;%PATH%
)

start http://localhost:3000
node server.js
pause
