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
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const sendLog = (msg) => {
        console.log(msg);
        if (mainWindow) {
            mainWindow.webContents.send('update-log', msg);
        }
    };

    sendLog('Update execution started...');
    sendLog(`Target URL: ${url}`);

    const currentPid = process.pid;
    const isDev = !app.isPackaged;

    // Locate the updater.bat file
    const updaterPath = isDev
        ? path.join(__dirname, '../updater.bat')
        : path.join(process.resourcesPath, 'updater.bat');

    sendLog(`Current PID: ${currentPid}`);
    sendLog(`Updater script: ${updaterPath}`);

    // Launch the updater batch file with arguments
    sendLog('Launching updater...');

    const updaterProcess = spawn('cmd.exe', ['/c', updaterPath, url, currentPid], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
    });

    updaterProcess.unref();

    sendLog('Updater process started.');
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
