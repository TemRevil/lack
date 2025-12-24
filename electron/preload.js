// Preload script for Electron
// This runs in a sandboxed context before the web page loads
// Use this to safely expose APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Send Windows notification
    sendNotification: (title, body) => {
        ipcRenderer.send('show-notification', { title, body });
    },
    // Get app version from package.json
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    // Check for updates using Electron auto-updater
    checkForUpdates: (manual = false) => ipcRenderer.invoke('check-for-updates', manual),
    // Download an available update
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    // Install the downloaded update
    installUpdate: () => ipcRenderer.invoke('install-update'),
    // Events from auto-updater
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, err) => callback(err)),
    onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress)),
    // Listen for update logs (legacy)
    onUpdateLog: (callback) => ipcRenderer.on('update-log', (_event, value) => callback(value))
});
