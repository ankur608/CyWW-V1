@echo off
title CyWW ActiveAI Platform Launcher
echo ========================================================
echo   Launching CyWW ActiveAI Web Defense Console...
echo ========================================================
cd /d "%~dp0"
start "" "http://localhost:3000"
node serve.js
pause
