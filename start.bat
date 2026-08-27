@echo off
setlocal

cd /d "%~dp0"
title SoulSync-Poetry Development

echo ========================================
echo    SoulSync-Poetry
echo    Starting frontend and backend...
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.

where node >nul 2>nul
if errorlevel 1 goto :node_missing

where npm.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing

call npm.cmd run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Development services stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%

:node_missing
echo Node.js was not found in PATH.
echo Please install Node.js or add it to PATH, then try again.
pause
exit /b 1

:npm_missing
echo npm.cmd was not found in PATH.
echo Please install Node.js or add it to PATH, then try again.
pause
exit /b 1
