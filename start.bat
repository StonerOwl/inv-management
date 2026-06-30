@echo off
:: Start the modern GUI launcher silently in the background using pythonw (no console window)
start "" "%~dp0backend\venv\Scripts\pythonw.exe" "%~dp0launcher.py"
exit
