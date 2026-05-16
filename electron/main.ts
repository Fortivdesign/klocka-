import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, desktopCapturer, screen, powerMonitor } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ActivityTracker } from './tracker';
import { ScreenshotService } from './screenshot';
import type { ClockEvent } from '../shared/types';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let tracker: ActivityTracker | null = null;
let screenshotter: ScreenshotService | null = null;
let isClockedIn = false;
let currentSessionStart: number | null = null;
let consentGiven = false;

const userDataDir = () => app.getPath('userData');

async function loadConsent(): Promise<boolean> {
  try {
    const p = path.join(userDataDir(), 'consent.json');
    const raw = await fs.readFile(p, 'utf-8');
    const obj = JSON.parse(raw);
    return obj.granted === true;
  } catch {
    return false;
  }
}

async function saveConsent(granted: boolean) {
  const p = path.join(userDataDir(), 'consent.json');
  await fs.writeFile(p, JSON.stringify({ granted, at: Date.now() }, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (isClockedIn) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function formatHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const refresh = () => {
    const elapsed = isClockedIn && currentSessionStart ? Date.now() - currentSessionStart : 0;
    const title = isClockedIn ? `⏱ ${formatHMS(elapsed)}` : 'Klocka';
    tray?.setTitle(title);
    const menu = Menu.buildFromTemplate([
      { label: isClockedIn ? `🟢 Inklockad · ${formatHMS(elapsed)}` : '⚪ Utklockad', enabled: false },
      { type: 'separator' },
      { label: 'Öppna Klocka', click: () => mainWindow?.show() },
      { label: isClockedIn ? 'Klocka ut' : 'Klocka in', click: () => mainWindow?.webContents.send('tray:toggle-clock') },
      { type: 'separator' },
      { label: 'Avsluta', click: () => { app.quit(); } },
    ]);
    tray?.setContextMenu(menu);
    tray?.setToolTip(isClockedIn ? `Klocka — ${formatHMS(elapsed)}` : 'Klocka');
  };
  refresh();
  setInterval(refresh, 1000);
}

function setupIpc() {
  ipcMain.handle('consent:get', async () => consentGiven);
  ipcMain.handle('consent:set', async (_e, granted: boolean) => {
    consentGiven = granted;
    await saveConsent(granted);
    return granted;
  });

  ipcMain.handle('clock:in', async (_e, payload: { userId: string; note?: string }) => {
    if (!consentGiven) throw new Error('Samtycke krävs innan inklockning.');
    isClockedIn = true;
    currentSessionStart = Date.now();
    tracker?.start();
    screenshotter?.start();
    const evt: ClockEvent = { userId: payload.userId, type: 'in', timestamp: currentSessionStart, note: payload.note };
    return evt;
  });

  ipcMain.handle('clock:out', async (_e, payload: { userId: string; note?: string }) => {
    isClockedIn = false;
    const ts = Date.now();
    const session = {
      start: currentSessionStart,
      end: ts,
      samples: tracker?.flush() ?? [],
      screenshots: screenshotter?.flushPending() ?? [],
    };
    tracker?.stop();
    screenshotter?.stop();
    currentSessionStart = null;
    const evt: ClockEvent = { userId: payload.userId, type: 'out', timestamp: ts, note: payload.note };
    return { event: evt, session };
  });

  ipcMain.handle('tracker:status', async () => ({
    clockedIn: isClockedIn,
    sessionStart: currentSessionStart,
    sampleCount: tracker?.sampleCount() ?? 0,
  }));

  ipcMain.handle('tracker:samples', async () => tracker?.peek() ?? []);

  ipcMain.handle('screenshot:pending', async () => screenshotter?.listPending() ?? []);

  ipcMain.handle('screenshot:approve', async (_e, id: string, approved: boolean) => {
    return screenshotter?.markApproved(id, approved);
  });

  ipcMain.handle('screenshot:capture-now', async () => screenshotter?.captureNow());

  ipcMain.handle('screenshot:data-url', async (_e, filePath: string) => {
    try {
      const buf = await fs.readFile(filePath);
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('app:user-data-dir', async () => userDataDir());
}

app.whenReady().then(async () => {
  consentGiven = await loadConsent();
  const screenshotDir = path.join(userDataDir(), 'screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });

  tracker = new ActivityTracker();
  screenshotter = new ScreenshotService({
    outputDir: screenshotDir,
    capture: async () => {
      const { workAreaSize } = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.floor(workAreaSize.width / 3), height: Math.floor(workAreaSize.height / 3) },
      });
      return sources[0]?.thumbnail ?? null;
    },
  });

  powerMonitor.on('suspend', () => { tracker?.markIdle(true); });
  powerMonitor.on('resume', () => { tracker?.markIdle(false); });
  powerMonitor.on('lock-screen', () => { tracker?.markIdle(true); });
  powerMonitor.on('unlock-screen', () => { tracker?.markIdle(false); });

  setupIpc();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:select-file', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Presentationer', extensions: ['pdf', 'key', 'pptx'] }] });
  return r.filePaths[0] ?? null;
});
