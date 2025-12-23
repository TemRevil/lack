const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

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
