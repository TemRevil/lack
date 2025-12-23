const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

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
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const sendLog = (msg) => {
        console.log(msg);
        if (mainWindow) {
            mainWindow.webContents.send('update-log', msg);
        }
    };

    sendLog('Update execution started...');
    sendLog(`Target URL: ${url}`);

    const tempPath = app.getPath('temp');
    const installerPath = path.join(tempPath, 'GunterSetup.exe');
    const scriptPath = path.join(tempPath, 'update_script.ps1');
    const currentPid = process.pid;

    sendLog(`Temp path: ${tempPath}`);
    sendLog(`Current PID: ${currentPid}`);

    // Create the PowerShell script file
    const psScriptContent = `
$Host.UI.RawUI.WindowTitle = "Gunter Updater"
Write-Host "--- GUNTER AUTO-UPDATER ---" -ForegroundColor Cyan
Write-Host "URL: ${url}" -ForegroundColor Gray
Write-Host "Download Path: ${installerPath}" -ForegroundColor Gray
Write-Host ""
Write-Host "[1/3] Downloading latest setup..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "${url}" -OutFile "${installerPath}" -ErrorAction Stop
    Write-Host "Download complete." -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[2/3] Launching installer..." -ForegroundColor Yellow
    Start-Process "${installerPath}"
    
    Write-Host ""
    Write-Host "[3/3] Closing Gunter to allow installation..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Stop-Process -Id ${currentPid} -Force
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
`.trim();

    try {
        fs.writeFileSync(scriptPath, psScriptContent, 'utf16le');
        sendLog('Update script created at: ' + scriptPath);
    } catch (err) {
        sendLog('Failed to create update script: ' + err.message);
        return;
    }

    // Send the terminal code to the app console for internal check
    if (mainWindow) {
        mainWindow.webContents.send('update-log', '--- SCRIPT CONTENT START ---');
        mainWindow.webContents.send('update-log', psScriptContent);
        mainWindow.webContents.send('update-log', '--- SCRIPT CONTENT END ---');
    }

    // Launch PowerShell with the script file using spawn for proper argument handling
    sendLog('Launching PowerShell script...');
    sendLog(`Script path: ${scriptPath}`);

    spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Normal',
        '-File', scriptPath
    ], {
        detached: true,
        stdio: 'ignore'
    }).unref();

    sendLog('PowerShell process started.');
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
