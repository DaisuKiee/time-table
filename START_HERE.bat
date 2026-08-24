@echo off
echo ========================================
echo CTU DAAN BANTAYAN TIMETABLING SYSTEM
echo ========================================
echo.
echo This will start BOTH backend and frontend servers
echo.
echo You will see TWO terminal windows:
echo   1. Backend Server (Port 5000)
echo   2. Frontend React App (Port 3000)
echo.
echo DO NOT CLOSE these windows while using the system
echo.
echo Press any key to start...
pause >nul

echo.
echo Starting Backend Server...
start "CTU Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak >nul

echo Starting Frontend React App...
start "CTU Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo BOTH SERVERS STARTING...
echo ========================================
echo.
echo Wait for:
echo   Backend: "Server running on port 5000"
echo   Frontend: Browser opens automatically
echo.
echo Then go to: http://localhost:3000
echo Login: admin@ctu.edu.ph / admin123
echo.
echo Press any key to exit this window...
echo (Backend and Frontend will keep running)
pause >nul
