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
    // Execute auto-update via terminal
    executeUpdate: (url) => ipcRenderer.send('execute-update', { url }),
    // Listen for update logs
    onUpdateLog: (callback) => ipcRenderer.on('update-log', (_event, value) => callback(value))
});
