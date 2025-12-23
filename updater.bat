@echo off
REM Gunter Auto-Updater Script
REM Parameters: %1 = Download URL, %2 = Current Process ID

title Gunter Auto-Updater
color 0B

echo.
echo ========================================
echo       GUNTER AUTO-UPDATER
echo ========================================
echo.

REM Get parameters
set DOWNLOAD_URL=%~1
set PROCESS_ID=%~2
set TEMP_DIR=%TEMP%
set INSTALLER_PATH=%TEMP_DIR%\GunterSetup.exe

echo Download URL: %DOWNLOAD_URL%
echo Process ID: %PROCESS_ID%
echo Installer Path: %INSTALLER_PATH%
echo.

REM Step 1: Download the installer
echo [1/3] Downloading latest setup...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%INSTALLER_PATH%'"

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo ERROR: Failed to download update!
    echo.
    pause
    exit /b 1
)

echo Download complete.
echo.

REM Step 2: Launch the installer
echo [2/3] Launching installer...
start "" "%INSTALLER_PATH%"
echo.

REM Step 3: Close Gunter app
echo [3/3] Closing Gunter to allow installation...
timeout /t 2 /nobreak >nul
taskkill /F /PID %PROCESS_ID% >nul 2>&1

echo.
echo Update process initiated successfully!
timeout /t 1 /nobreak >nul
exit
