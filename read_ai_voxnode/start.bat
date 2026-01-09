@echo off
chcp 65001 >nul
title VoiceReader AI - Startup Script

:: ============================================
:: VoiceReader AI - Startup Script
:: Windows Version
:: ============================================

:: Configuration
set BACKEND_PORT=5000
set FRONTEND_PORT=8000
set BACKEND_DIR=backend
set FRONTEND_DIR=frontend
set VENV_DIR=%BACKEND_DIR%\venv
set LOG_DIR=logs
set PID_FILE=.server_pids.txt

:: Functions
:print_header
echo.
echo =========================================
echo     VoiceReader AI - Startup Script     
echo =========================================
echo.
goto :eof

:print_status
echo [STATUS] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:check_dependencies
call :print_status "Checking dependencies..."

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Python not found"
    echo Please install Python 3.8 or higher from:
    echo https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
call :print_success "Python %PYTHON_VERSION% found"

:: Check pip
python -m pip --version >nul 2>&1
if errorlevel 1 (
    call :print_warning "pip not found, trying to install..."
    python -m ensurepip --upgrade
)

call :print_success "Dependencies check complete"
goto :eof

:create_directories
call :print_status "Creating necessary directories..."

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%BACKEND_DIR%\uploads" mkdir "%BACKEND_DIR%\uploads"

call :print_success "Directories created"
goto :eof

:setup_virtualenv
call :print_status "Setting up Python virtual environment..."

if not exist "%VENV_DIR%" (
    call :print_status "Creating virtual environment..."
    python -m venv "%VENV_DIR%"
    
    if errorlevel 1 (
        call :print_error "Failed to create virtual environment"
        pause
        exit /b 1
    )
    call :print_success "Virtual environment created"
) else (
    call :print_success "Virtual environment already exists"
)

:: Activate virtual environment
call :print_status "Activating virtual environment..."
call "%VENV_DIR%\Scripts\activate.bat"

:: Upgrade pip
call :print_status "Upgrading pip..."
python -m pip install --upgrade pip

:: Install requirements
if exist "%BACKEND_DIR%\requirements.txt" (
    call :print_status "Installing Python dependencies..."
    pip install -r "%BACKEND_DIR%\requirements.txt"
    
    if errorlevel 1 (
        call :print_error "Failed to install dependencies"
        pause
        exit /b 1
    )
    call :print_success "Dependencies installed"
) else (
    call :print_error "requirements.txt not found in %BACKEND_DIR%"
    pause
    exit /b 1
)
goto :eof

:start_backend
call :print_status "Starting backend server..."

:: Check if port is already in use
netstat -ano | findstr ":%BACKEND_PORT% " | findstr "LISTENING" >nul
if not errorlevel 1 (
    call :print_warning "Port %BACKEND_PORT% is already in use"
    echo Attempting to kill existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING"') do taskkill /F /PID %%a
    timeout /t 2 /nobreak >nul
)

:: Start backend
cd "%BACKEND_DIR%"
start /B "VoiceReader Backend" python server.py > "..\%LOG_DIR%\backend.log" 2>&1
cd ..

:: Get PID of the backend (approximate)
timeout /t 2 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /fi "WindowTitle eq VoiceReader Backend" /fo csv ^| findstr /i "python"') do (
    set BACKEND_PID=%%~a
)

:: Save PID
echo BACKEND=%BACKEND_PID% > "%PID_FILE%"

:: Wait for backend to start
call :print_status "Waiting for backend to start..."

setlocal enabledelayedexpansion
for /l %%i in (1,1,30) do (
    curl -s "http://localhost:%BACKEND_PORT%/api/health" >nul 2>&1
    if not errorlevel 1 (
        call :print_success "Backend started successfully"
        echo   ^> Backend URL: http://localhost:%BACKEND_PORT%
        echo   ^> Health check: http://localhost:%BACKEND_PORT%/api/health
        echo   ^> Logs: %LOG_DIR%\backend.log
        endlocal
        goto :eof
    )
    timeout /t 1 /nobreak >nul
    <nul set /p ".=."
)
endlocal

call :print_error "Backend failed to start"
echo Check logs: %LOG_DIR%\backend.log
exit /b 1
goto :eof

:start_frontend
call :print_status "Starting frontend server..."

:: Check if port is already in use
set /a FRONTEND_PORT_CURRENT=%FRONTEND_PORT%
:check_port
netstat -ano | findstr ":%FRONTEND_PORT_CURRENT% " | findstr "LISTENING" >nul
if not errorlevel 1 (
    set /a FRONTEND_PORT_CURRENT+=1
    goto check_port
)

:: Start frontend server
cd "%FRONTEND_DIR%"
start /B "VoiceReader Frontend" python -m http.server %FRONTEND_PORT_CURRENT% > "..\%LOG_DIR%\frontend.log" 2>&1
cd ..

:: Get PID
timeout /t 2 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /fi "WindowTitle eq VoiceReader Frontend" /fo csv ^| findstr /i "python"') do (
    set FRONTEND_PID=%%~a
)

:: Save PID
echo FRONTEND=%FRONTEND_PID% >> "%PID_FILE%"

call :print_success "Frontend started successfully"
echo   ^> Frontend URL: http://localhost:%FRONTEND_PORT_CURRENT%
echo   ^> Direct file: file:///%CD%/%FRONTEND_DIR%/index.html
echo   ^> Logs: %LOG_DIR%\frontend.log

set FRONTEND_PORT=%FRONTEND_PORT_CURRENT%
goto :eof

:open_browser
call :print_status "Opening browser..."

set FRONTEND_URL=http://localhost:%FRONTEND_PORT%
start "" "%FRONTEND_URL%"
goto :eof

:cleanup
call :print_status "Cleaning up..."

:: Kill processes from PID file
if exist "%PID_FILE%" (
    for /f "tokens=1,2 delims==" %%a in (%PID_FILE%) do (
        call :print_status "Stopping %%a..."
        taskkill /F /PID %%b >nul 2>&1
    )
    del "%PID_FILE%"
)

:: Deactivate virtual environment
if defined VIRTUAL_ENV (
    call :print_status "Deactivating virtual environment..."
    deactivate
)

call :print_success "Cleanup completed"
goto :eof

:monitor_servers
call :print_header
echo VoiceReader AI is now running!
echo.

echo === SERVERS ===
echo Backend:  http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.

echo === API ENDPOINTS ===
echo Health:    http://localhost:%BACKEND_PORT%/api/health
echo Config:    http://localhost:%BACKEND_PORT%/api/config
echo.

echo === LOG FILES ===
echo Backend:  %LOG_DIR%\backend.log
echo Frontend: %LOG_DIR%\frontend.log
echo.

echo === QUICK TESTS ===
echo Test backend:   curl http://localhost:%BACKEND_PORT%/api/health
echo Open frontend:  Open the URL above in your browser
echo.

echo === CONTROLS ===
echo Press Ctrl+C to stop all servers
echo.

:: Monitor loop
:monitor_loop
timeout /t 10 /nobreak >nul

:: Check backend health
curl -s "http://localhost:%BACKEND_PORT%/api/health" >nul
if errorlevel 1 (
    call :print_error "Backend server may be down!"
    echo Check logs: %LOG_DIR%\backend.log
)

goto monitor_loop
goto :eof

:: Main execution
call :print_header

:: Set up cleanup on exit
:main
call :check_dependencies
call :create_directories
call :setup_virtualenv

call :start_backend
if errorlevel 1 (
    call :print_error "Failed to start backend. Exiting."
    pause
    goto :cleanup_and_exit
)

call :start_frontend

:: Ask to open browser
set /p OPEN_BROWSER="Open browser automatically? [Y/n]: "
if /i "%OPEN_BROWSER%" neq "n" (
    call :open_browser
)

:: Monitor servers
call :monitor_servers

:cleanup_and_exit
call :cleanup
pause
exit /b 0