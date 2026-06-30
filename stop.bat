@echo off
color 0C
echo =================================================================
echo                    INVOICE AI - SHUTDOWN SCRIPT
echo =================================================================
echo.
echo Stopping Docker containers...
docker compose stop

echo.
echo Stopping background Node.js (Frontend)...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Stopping background Python (Backend)...
:: Only kill python instances running from our backend directory if possible, but taskkill by name is easier
taskkill /F /IM python.exe >nul 2>&1

echo.
echo Stopping Ollama inference server...
taskkill /F /IM ollama.exe >nul 2>&1
taskkill /F /IM ollama_llama_server.exe >nul 2>&1

echo.
echo All background systems terminated.
echo.
pause
