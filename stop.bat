@echo off
setlocal EnableDelayedExpansion
title AICTE Samanvay - Stop Services
cd /d "%~dp0"

echo ========================================================================
echo   AICTE SAMANVAY (समन्वय) - Clean Shutdown
echo ========================================================================
echo.

:: Detect Docker CLI
where docker >nul 2>&1
if errorlevel 1 (
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;!PATH!"
    ) else if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;!PATH!"
    ) else (
        echo [ERROR] Docker command-line tool not found in PATH.
        pause
        exit /b 1
    )
)

set "COMPOSE_CMD=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose version >nul 2>&1
    if not errorlevel 1 (
        set "COMPOSE_CMD=docker-compose"
    )
)

echo [INFO] Stopping all containers...
%COMPOSE_CMD% down

echo.
echo ========================================================================
echo   All AICTE Samanvay containers have been stopped successfully.
echo ========================================================================
echo.
pause
