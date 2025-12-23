const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
    const isDev = !app.isPackaged;
    // Define icon path dynamically
    const iconPath = isDev
        ? path.join(__dirname, '../public/icon.png')
        : path.join(__dirname, '../dist/icon.png');

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Hide the default menu bar on Windows/Linux (optional, simpler look)
        autoHideMenuBar: true
    });

    if (isDev) {
        // In development, load from the Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools for debugging
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        // We assume dist is one level up from this file (which is in electron/)
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// Handle notification requests from renderer
ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
        const isDev = !app.isPackaged;
        const iconPath = isDev
            ? path.join(__dirname, '../public/icon.png')
            : path.join(__dirname, '../dist/icon.png');

        const notification = new Notification({
            title: title,
            body: body,
            icon: iconPath,
            urgency: 'normal'
        });
        notification.show();
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.on('execute-update', (event, { url }) => {
    console.log('Update execution started...');
    console.log('Target URL:', url);

    const tempPath = app.getPath('temp');
    const installerPath = path.join(tempPath, 'GunterSetup.exe');
    const currentPid = process.pid;

    console.log('Temp path:', tempPath);
    console.log('Current PID:', currentPid);

    // Command specifically formatted for a visible PowerShell window
    const psCommand = `
        $Host.UI.RawUI.WindowTitle = "Gunter Updater";
        Write-Host ">>> GUNTER AUTO-UPDATER" -ForegroundColor Cyan;
        Write-Host ">>> URL: ${url}" -ForegroundColor Gray;
        Write-Host ">>> DOWNLOAD PATH: ${installerPath}" -ForegroundColor Gray;
        Write-Host "";
        Write-Host "[1/3] Downloading latest setup..." -ForegroundColor Yellow;
        try {
            Invoke-WebRequest -Uri "${url}" -OutFile "${installerPath}" -ErrorAction Stop;
            Write-Host ">>> Download complete." -ForegroundColor Green;
            
            Write-Host "";
            Write-Host "[2/3] Launching installer..." -ForegroundColor Yellow;
            Start-Process "${installerPath}";
            
            Write-Host "";
            Write-Host "[3/3] Closing Gunter to allow installation..." -ForegroundColor Yellow;
            Start-Sleep -Seconds 2;
            Stop-Process -Id ${currentPid} -Force;
        } catch {
            Write-Host ">>> ERROR: $($_.Exception.Message)" -ForegroundColor Red;
            Write-Host ">>> Press any key to exit..." -ForegroundColor Red;
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown");
        }
    `;

    console.log('Final PowerShell command generated.');

    // Use 'start' to ensure a new visible window opens
    const fullCommand = `start powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand.replace(/"/g, '`"').replace(/\n/g, '')}"`;

    console.log('Launching PowerShell window...');

    const { exec } = require('child_process');
    exec(fullCommand, (error) => {
        if (error) {
            console.error('Failed to launch PowerShell:', error);
        } else {
            console.log('PowerShell window launched successfully.');
        }
    });
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
