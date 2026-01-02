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
autoUpdater.autoDownload = true; // Automatically start download when update is found

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
        log.info('Update available:', info.version);
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available');
        mainWindow.webContents.send('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('AutoUpdater error:', err);
        mainWindow.webContents.send('update-error', err);
    });

    autoUpdater.on('download-progress', (progress) => {
        // Reduced frequency of progress logs to avoid spamming main log
        if (Math.round(progress.percent) % 10 === 0) {
            log.info(`Download progress: ${Math.round(progress.percent)}%`);
        }
        mainWindow.webContents.send('update-download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded:', info.version);
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

// Implementation of download-from-url to support rollback as an update
ipcMain.handle('download-from-url', async (event, { url }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const sendLog = (msg) => {
        console.log(msg);
        if (mainWindow) {
            mainWindow.webContents.send('update-log', msg);
        }
    };

    sendLog(`Starting download from URL: ${url}`);
    const installerPath = path.join(app.getPath('temp'), 'GunterSetup.exe');

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(installerPath);

        const download = (downloadUrl) => {
            https.get(downloadUrl, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    download(response.headers.location);
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(installerPath);
                    reject(new Error(`Download failed: ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const percent = (downloadedSize / totalSize) * 100;
                    if (mainWindow) {
                        mainWindow.webContents.send('update-download-progress', {
                            percent: percent,
                            bytesPerSecond: 0,
                            transferred: downloadedSize,
                            total: totalSize
                        });
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    sendLog('Download complete');
                    if (mainWindow) {
                        mainWindow.webContents.send('update-downloaded', {
                            version: 'rollback',
                            downloadedFile: installerPath
                        });
                    }

                    // We also need a way to trigger the installation of this specific file
                    // But we can just use the same logic as install-update if we modify quitAndInstall?
                    // No, quitAndInstall is specifically for autoUpdater downloads.
                    // For custom downloads, we use the spawn logic.
                    resolve(installerPath);
                });

                file.on('error', (err) => {
                    fs.unlinkSync(installerPath);
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlinkSync(installerPath);
                reject(err);
            });
        };

        download(url);
    });
});

ipcMain.handle('install-from-path', (event, { filePath }) => {
    try {
        spawn('cmd.exe', ['/c', 'start', '""', filePath], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
        }).unref();

        setTimeout(() => app.quit(), 2000);
        return true;
    } catch (err) {
        log.error('install-from-path failed', err);
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
