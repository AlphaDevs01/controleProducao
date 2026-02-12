import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDB, loadStateFromDB, saveStateToDB } from './database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Determine paths safely
// __dirname is .../dist-electron
// We want to reach .../dist (sibling of dist-electron)
const distPath = path.join(__dirname, '../dist');
const publicPath = app.isPackaged ? distPath : path.join(__dirname, '../public');

let win: BrowserWindow | null;

function createWindow() {
  if (require('electron-squirrel-startup')) return;

  win = new BrowserWindow({
    // icon: path.join(publicPath, 'icon.png'), // Add icon if available
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(publicPath, 'icon.ico') // Ensure icon is set for both dev and prod
  });

  win.removeMenu(); // Clean look for desktop app

  // In development, load from localhost
  // In production, load from the dist folder
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' }); // ✅ Open DevTools for debugging
  } else {
    win.loadFile(path.join(distPath, 'index.html'));
  }
}

// Database Init
// Only init DB if we are not handling a squirrel startup event
if (!require('electron-squirrel-startup')) {
  // We initialize DB but catch error so app still opens if network is down
  initDB().catch(err => {
      console.error("WARNING: Initial DB Connection Failed (Is network drive accessible?)", err);
  });
}

// IPC Handlers
ipcMain.handle('db-load', async () => {
  console.log('[IPC] db-load called');
  try {
    const data = await loadStateFromDB();
    // Simplified log for clarity
    console.log('[IPC] db-load ok. Items loaded:', {
        projects: data?.projects?.length ?? 0,
        products: data?.products?.length ?? 0
    });
    return data;
  } catch (e) {
    console.error('[IPC] db-load error:', e);
    return null;
  }
});

ipcMain.handle('db-save', async (event, state) => {
  console.log('[IPC] db-save called', {
    projects: state?.projects?.length ?? 0,
    products: state?.products?.length ?? 0,
  });

  try {
    await saveStateToDB(state);
    console.log('[IPC] db-save ok');
    return { success: true };
  } catch (e) {
    console.error('[IPC] db-save error:', e);
    return { success: false, error: String(e) };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
    if (!require('electron-squirrel-startup')) {
        createWindow();
    }
});