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
    const tempPath = app.getPath('temp');
    const installerPath = path.join(tempPath, 'GunterSetup.exe');
    const currentPid = process.pid;

    const psCommand = `
        $Host.UI.RawUI.WindowTitle = "Gunter Updater";
        Write-Host ">>> Downloading update from GitHub..." -ForegroundColor Cyan;
        try {
            Invoke-WebRequest -Uri "${url}" -OutFile "${installerPath}" -ErrorAction Stop;
            Write-Host ">>> Launching installer..." -ForegroundColor Green;
            Start-Process "${installerPath}";
            Write-Host ">>> Closing Gunter to allow installation..." -ForegroundColor Yellow;
            Start-Sleep -Seconds 1;
            Stop-Process -Id ${currentPid} -Force;
        } catch {
            Write-Host ">>> Error: $($_.Exception.Message)" -ForegroundColor Red;
            Pause;
        }
    `;

    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
    }).unref();
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
