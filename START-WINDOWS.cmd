@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 20 or newer for phone controllers. Opening keyboard mode.
 start "" "host.html"
 pause
 exit /b
)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8080"
node server.cjs
pause
