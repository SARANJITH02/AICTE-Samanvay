@echo off
setlocal EnableDelayedExpansion
title AICTE Samanvay Platform Launcher
cd /d "%~dp0"

:: -------------------------------------------------------------------------
:: AICTE SAMANVAY (समन्वय) - Centralized Launcher
:: -------------------------------------------------------------------------

:: If an argument was provided, jump straight to the action
if not "%~1"=="" (
    if /i "%~1"=="start" goto :action_start_bg
    if /i "%~1"=="up" goto :action_start_fg
    if /i "%~1"=="stop" goto :action_stop
    if /i "%~1"=="down" goto :action_stop
    if /i "%~1"=="logs" goto :action_logs
    if /i "%~1"=="rebuild" goto :action_rebuild
    if /i "%~1"=="dev" goto :action_dev
    if /i "%~1"=="status" goto :action_status
    if /i "%~1"=="ps" goto :action_status
    echo [ERROR] Unknown option: %~1
    echo Allowed options: start, up, stop, logs, rebuild, dev, status
    pause
    exit /b 1
)

:menu
cls
echo ========================================================================
echo            AICTE SAMANVAY (समन्वय) PLATFORM LAUNCHER
echo      Air-Gapped Cross-Bureau Grievance ^& Regulatory Framework
echo ========================================================================
echo.
echo   [1] Start All Services (Recommended - Background / Detached)
echo   [2] Start All Services (Foreground with Live Streaming Logs)
echo   [3] Stop All Services (Clean Shutdown)
echo   [4] View Live Streaming Logs
echo   [5] Rebuild and Restart All Services
echo   [6] Start Frontend Only (Local Dev: npm run dev)
echo   [7] View Service Status (docker compose ps)
echo   [8] Open Web Application (http://localhost)
echo   [9] Exit
echo.
echo ========================================================================
set "choice="
set /p "choice=Select an option [1-9] (Default: 1): "
if "!choice!"=="" set "choice=1"

if "!choice!"=="1" goto :action_start_bg
if "!choice!"=="2" goto :action_start_fg
if "!choice!"=="3" goto :action_stop
if "!choice!"=="4" goto :action_logs
if "!choice!"=="5" goto :action_rebuild
if "!choice!"=="6" goto :action_dev
if "!choice!"=="7" goto :action_status
if "!choice!"=="8" (
    start http://localhost
    goto :menu
)
if "!choice!"=="9" exit /b 0

echo Invalid selection. Please choose an option between 1 and 9.
timeout /t 2 >nul
goto :menu


:: -------------------------------------------------------------------------
:: Subroutine: Check Prerequisites (Docker, PATH, Daemon, .env)
:: -------------------------------------------------------------------------
:check_prereqs
echo.
echo [1/3] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env not found. Creating default .env from .env.example...
        copy /y ".env.example" ".env" >nul
        echo [OK] Created .env successfully.
    ) else (
        echo [WARNING] Neither .env nor .env.example was found.
    )
) else (
    echo [OK] Environment file (.env) is present.
)

echo [2/3] Checking Docker installation...
set "DOCKER_BIN=docker"
where docker >nul 2>&1
if errorlevel 1 (
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;!PATH!"
    ) else if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;!PATH!"
    ) else (
        echo [ERROR] Docker command-line tool was not found in your PATH.
        echo Please ensure Docker Desktop is installed: https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
    )
)

:: Detect compose command format
set "COMPOSE_CMD=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose version >nul 2>&1
    if not errorlevel 1 (
        set "COMPOSE_CMD=docker-compose"
    ) else (
        echo [ERROR] Neither 'docker compose' nor 'docker-compose' was found.
        pause
        exit /b 1
    )
)
echo [OK] Docker CLI detected (!COMPOSE_CMD!).

echo [3/3] Checking Docker Engine / Daemon status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [INFO] Docker daemon is not running. Attempting to start Docker Desktop...
    
    set "DOCKER_EXE="
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
        set "DOCKER_EXE=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
    ) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    )

    if defined DOCKER_EXE (
        echo [INFO] Found Docker Desktop at: !DOCKER_EXE!
        start "" "!DOCKER_EXE!"
        echo [INFO] Waiting for Docker daemon to become responsive...
        echo        (This typically takes 20-45 seconds while the engine boots)
        
        set /a RETRIES=0
        :wait_docker_loop
        timeout /t 4 /nobreak >nul
        docker info >nul 2>&1
        if not errorlevel 1 goto :docker_daemon_ready
        set /a RETRIES+=1
        if !RETRIES! geq 25 (
            echo.
            echo [ERROR] Docker daemon took too long to start.
            echo Please verify Docker Desktop is running and try running this script again.
            pause
            exit /b 1
        )
        <nul set /p=.
        goto :wait_docker_loop
        :docker_daemon_ready
        echo.
        echo [OK] Docker daemon is ready!
    ) else (
        echo [ERROR] Could not find Docker Desktop.exe automatically.
        echo Please launch Docker Desktop manually and retry.
        pause
        exit /b 1
    )
) else (
    echo [OK] Docker daemon is actively running.
)
exit /b 0


:: -------------------------------------------------------------------------
:: Action 1: Start in Background
:: -------------------------------------------------------------------------
:action_start_bg
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   Launching AICTE Samanvay Services in Background...
echo ========================================================================
%COMPOSE_CMD% up -d
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start services via docker compose.
    pause
    exit /b 1
)

echo.
echo Waiting a few seconds for services to initialize...
timeout /t 4 /nobreak >nul

echo.
echo ========================================================================
echo   AICTE SAMANVAY IS NOW ACTIVE!
echo ========================================================================
echo   - Web Application:     http://localhost
echo   - Backend API:         http://localhost/api
echo   - Ingress Gateway:     Port 80 (Nginx Reverse Proxy)
echo ========================================================================
echo.
%COMPOSE_CMD% ps
echo.
set "open_now="
set /p "open_now=Open Web UI at http://localhost now? [Y/n]: "
if "!open_now!"=="" set "open_now=Y"
if /i "!open_now!"=="y" (
    start http://localhost
)
echo.
echo Tip: Use stop.bat or run.bat [3] to stop services at any time.
echo.
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 2: Start in Foreground
:: -------------------------------------------------------------------------
:action_start_fg
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   Launching AICTE Samanvay Services (Press Ctrl+C to terminate)...
echo ========================================================================
%COMPOSE_CMD% up
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 3: Stop Services
:: -------------------------------------------------------------------------
:action_stop
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   Stopping AICTE Samanvay Services...
echo ========================================================================
%COMPOSE_CMD% down
echo.
echo [OK] All services have been stopped.
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 4: View Logs
:: -------------------------------------------------------------------------
:action_logs
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   Streaming Service Logs (Press Ctrl+C to exit log view)...
echo ========================================================================
%COMPOSE_CMD% logs -f --tail=100
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 5: Rebuild and Restart
:: -------------------------------------------------------------------------
:action_rebuild
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   Rebuilding Container Images and Restarting...
echo ========================================================================
%COMPOSE_CMD% up -d --build
if errorlevel 1 (
    echo.
    echo [ERROR] Rebuild failed.
    pause
    exit /b 1
)

echo.
echo Rebuild complete. Current service status:
%COMPOSE_CMD% ps
echo.
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 6: Local Dev Frontend
:: -------------------------------------------------------------------------
:action_dev
echo.
echo ========================================================================
echo   Starting Vite React Frontend in Local Development Mode...
echo ========================================================================
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies (npm install)...
    cd frontend
    call npm install
    cd ..
)

echo [INFO] Starting Vite dev server...
cd frontend
call npm run dev
cd ..
pause
exit /b 0


:: -------------------------------------------------------------------------
:: Action 7: Service Status
:: -------------------------------------------------------------------------
:action_status
call :check_prereqs
if errorlevel 1 exit /b 1

echo.
echo ========================================================================
echo   AICTE Samanvay - Container Status
echo ========================================================================
%COMPOSE_CMD% ps
echo.
pause
exit /b 0
