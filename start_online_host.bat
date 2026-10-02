@echo off
echo ========================================================
echo   Starting Arcane Survival 3D Online Host...
echo ========================================================
cd /d "%~dp0PlayableWebDemo"
start "Game 3D Server" node server.js
timeout /t 2 /nobreak >nul
echo Starting public tunnel...
echo (If prompted for Tunnel Password on loca.lt, enter your public IP from https://loca.lt/mytunnelpassword)
npx --yes localtunnel --port 3000 --subdomain arcane-survival-3d
pause
