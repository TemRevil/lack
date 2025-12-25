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
        const { pathToFileURL } = require('url');
        const indexPath = path.join(__dirname, '../dist/index.html');

        try {
            if (fs.existsSync(indexPath)) {
                log.info('Loading index from:', indexPath);
                mainWindow.loadFile(indexPath);
            } else {
                // Try to handle cases where files are inside the asar archive or packaged differently
                const altPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
                log.warn(`Index not found at ${indexPath}. Trying ${altPath}`);
                if (fs.existsSync(altPath)) {
                    mainWindow.loadURL(pathToFileURL(altPath).href);
                } else {
                    const fallbackUrl = pathToFileURL(indexPath).href;
                    log.error(`Neither ${indexPath} nor ${altPath} exist. Will attempt loading ${fallbackUrl}`);
                    mainWindow.loadURL(fallbackUrl);
                }
            }
        } catch (err) {
            log.error('Error loading index.html:', err);
            // Attempt a last-ditch load using file URL
            try {
                mainWindow.loadURL(pathToFileURL(indexPath).href);
            } catch (err2) {
                log.error('Fallback loadURL also failed:', err2);
            }
        }

        // Helpful diagnostics if something goes wrong while loading renderer
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            log.error('Renderer failed to load:', { errorCode, errorDescription, validatedURL });
        });
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

// Keep legacy execute-update handler as a fallback but mark deprecated
ipcMain.on('execute-update', (event, { url }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const sendLog = (msg) => {
        console.log(msg);
        if (mainWindow) {
            mainWindow.webContents.send('update-log', msg);
        }
    };

    sendLog('Legacy update execution started...');
    sendLog(`Download URL: ${url}`);

    const installerPath = path.join(app.getPath('temp'), 'GunterSetup.exe');

    sendLog(`Download path: ${installerPath}`);
    sendLog('Starting download...');

    const downloadFile = (downloadUrl) => {
        const file = fs.createWriteStream(installerPath);

        https.get(downloadUrl, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                sendLog(`Following redirect to: ${response.headers.location}`);
                file.close();
                // Clean up partial file
                try {
                    fs.unlinkSync(installerPath);
                } catch (e) { }
                // Follow the redirect
                downloadFile(response.headers.location);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                try {
                    fs.unlinkSync(installerPath);
                } catch (e) { }
                sendLog(`Download failed with status code: ${response.statusCode}`);
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            let lastPercent = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const percent = Math.floor((downloadedSize / totalSize) * 100);
                if (percent !== lastPercent) {
                    sendLog(`Downloading: ${percent}%`);
                    lastPercent = percent;
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                sendLog('Download 100% complete!');
                sendLog('Launching installer...');

                // Launch the installer
                try {
                    // Launch via cmd default to ensure visible prompt and correct execution
                    spawn('cmd.exe', ['/c', 'start', '""', installerPath], {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: false
                    }).unref();

                    sendLog('Installer launched successfully!');
                    sendLog('Closing app in 2 seconds...');

                    // Close the app after 2 seconds
                    setTimeout(() => {
                        app.quit();
                    }, 2000);
                } catch (err) {
                    sendLog(`Error launching installer: ${err.message}`);
                }
            });

            file.on('error', (err) => {
                try {
                    fs.unlinkSync(installerPath);
                } catch (e) { }
                sendLog(`File write error: ${err.message}`);
            });
        }).on('error', (err) => {
            try {
                fs.unlinkSync(installerPath);
            } catch (e) { }
            sendLog(`Download error: ${err.message}`);
        });
    };

    try {
        downloadFile(url);
    } catch (err) {
        sendLog(`Error starting download: ${err.message}`);
    }
});

app.whenReady().then(async () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // TEST HOOK: allow forcing a check for updates against configured provider (e.g., GitHub)
    if (process.env.TEST_CHECK_PROVIDER === 'github') {
        log.info('TEST_CHECK_PROVIDER=github detected — invoking autoUpdater.checkForUpdates()');
        try {
            const res = await autoUpdater.checkForUpdates();
            log.info('checkForUpdates result:', res);
            console.log('checkForUpdates result:', res);
        } catch (err) {
            log.error('checkForUpdates failed:', err);
            console.error('checkForUpdates failed:', err);
        }
    } else if (app.isPackaged) {
        // Auto-check for updates on startup in production builds
        log.info('App is packaged — checking for updates on startup');
        try {
            const res = await autoUpdater.checkForUpdates();
            log.info('Startup checkForUpdates result:', res);
        } catch (err) {
            log.error('Startup checkForUpdates failed:', err);
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
