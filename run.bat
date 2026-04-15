@echo on
cd /d %~dp0
start cmd /k "npm run dev"
timeout /t 5 >nul
start cmd /k "npm run electron:start"
pause