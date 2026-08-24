@echo off
echo ========================================
echo   Restarting Backend Server
echo ========================================
echo.

echo 🛑 Stopping existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ✅ Stopped all Node processes
echo.
echo 🚀 Starting backend server...
echo.

cd backend
start "Timetable Backend" cmd /k "npm start"

echo.
echo ✅ Backend server started!
echo.
echo 📝 Check the new window for server logs
echo.
pause
