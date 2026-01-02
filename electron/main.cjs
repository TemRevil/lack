const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');

// Electron-updater and logging
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'main.log');
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // we will control download manually

function createWindow() {
    const isDev = !app.isPackaged;
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
        autoHideMenuBar: true
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Wire auto-updater events to renderer
    autoUpdater.on('checking-for-update', () => {
        mainWindow.webContents.send('update-log', 'Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        mainWindow.webContents.send('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('AutoUpdater error:', err);
        mainWindow.webContents.send('update-error', err);
    });

    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (info) => {
        mainWindow.webContents.send('update-downloaded', info);
    });
}

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

// New auto-update IPC handlers
ipcMain.handle('check-for-updates', async (_event, manual = false) => {
    try {
        if (process.env.UPDATE_URL) {
            autoUpdater.setFeedURL({ url: process.env.UPDATE_URL });
        }
        const res = await autoUpdater.checkForUpdates();
        return res;
    } catch (err) {
        log.warn('check-for-updates failed', err);
        throw err;
    }
});

ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return true;
    } catch (err) {
        log.error('download-update failed', err);
        throw err;
    }
});

ipcMain.handle('install-update', () => {
    try {
        autoUpdater.quitAndInstall();
    } catch (err) {
        log.error('install-update failed', err);
        throw err;
    }
});



app.whenReady().then(async () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Auto-update disabled by default - users can manually check via settings
    log.info('App ready. Auto-update is disabled by default.');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
