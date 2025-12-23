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
    // Manually trigger update check
    checkForUpdates: () => ipcRenderer.send('check-for-updates-manual'),
    // Listen for update messages
    onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_event, value) => callback(value)),
    // Listen for update downloaded
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback())
});
