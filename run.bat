@echo off
title Hotel Management Frontend (React + Vite)
cls
echo ====================================================
echo   KHOI DONG FRONTEND REACTJS (PORT 5173)
echo ====================================================
echo.
call npm.cmd run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Co loi xay ra khi khoi dong frontend.
    pause
)
