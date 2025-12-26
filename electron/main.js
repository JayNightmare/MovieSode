// Electron main process
// Launches the Next.js app (assumes `npm run dev` is already running or started via dev:desktop)

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");

const isDev = process.env.NODE_ENV !== "production";
const NEXT_URL = process.env.BASE_URL || "http://localhost:3000";

// Ensure local-first storage dirs exist in Documents/MovieSode
const DOCS_BASE = path.join(os.homedir(), "Documents", "MovieSode");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DOCS_BASE, "Uploads");
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(DOCS_BASE, "Episodes");

function ensureStorageDirs() {
        [DOCS_BASE, UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
                try {
                        fs.mkdirSync(dir, { recursive: true });
                } catch (err) {
                        console.error("Failed to ensure storage dir", dir, err);
                }
        });
        // Expose to renderer/Next
        process.env.UPLOAD_DIR = UPLOAD_DIR;
        process.env.OUTPUT_DIR = OUTPUT_DIR;
}

function createWindow() {
        const win = new BrowserWindow({
                width: 1280,
                height: 800,
                webPreferences: {
                        preload: path.join(__dirname, "preload.js"),
                },
                title: "MovieSode",
                backgroundColor: "#0a0a0a",
        });

        win.setMenuBarVisibility(false);
        win.loadURL(NEXT_URL);

        if (isDev) {
                win.webContents.openDevTools({ mode: "detach" });
        }
}

app.whenReady().then(() => {
        ensureStorageDirs();
        createWindow();

        app.on("activate", () => {
                if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
});

app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
});

// IPC: open native file dialog
ipcMain.handle("select-video-file", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [
                        {
                                name: "Video",
                                extensions: ["mp4", "mkv", "mov", "avi", "wmv"],
                        },
                        { name: "All Files", extensions: ["*"] },
                ],
        });
        if (canceled || !filePaths.length) return null;
        return filePaths[0];
});
