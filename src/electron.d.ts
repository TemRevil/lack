// Type declarations for Electron APIs exposed via contextBridge
interface ElectronAPI {
    sendNotification: (title: string, body: string) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };
