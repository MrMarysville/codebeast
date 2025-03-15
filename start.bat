@echo off
echo =====================================
echo   Hybrid Encoding System Launcher    
echo =====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is required but not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Ensure all dependencies are installed
echo Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies (this may take a few minutes)...
    call npm run install:all
    echo Dependencies installed successfully.
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Start the application using our robust script
echo Starting the application...
node start-app.js 