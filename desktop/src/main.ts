import fs from 'node:fs';
import path from 'node:path';

import { app, BrowserWindow, dialog, Menu } from 'electron';

type LocalServer = {
  close: () => Promise<void>;
  getUrl: () => Promise<string>;
};

type LocalServerModule = {
  bootstrap: (options: {
    hostname: string;
    port: number;
  }) => Promise<LocalServer>;
};

let mainWindow: BrowserWindow | null = null;
let localServer: LocalServer | null = null;
let isClosingServer = false;

const clearApplicationCache = (): void => {
  const userDataPath = app.getPath('userData');
  const cacheDirectories = [
    'Cache',
    'Code Cache',
    'DawnGraphiteCache',
    'DawnWebGPUCache',
    'GPUCache',
  ];

  for (const directory of cacheDirectories) {
    try {
      fs.rmSync(path.join(userDataPath, directory), {
        force: true,
        recursive: true,
      });
    } catch {
      // Uninstallation must continue even if Windows is still releasing a cache file.
    }
  }
};

if (process.argv.includes('--squirrel-uninstall')) {
  clearApplicationCache();
}

if (require('electron-squirrel-startup')) {
  app.quit();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

const startLocalServer = async (): Promise<number> => {
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_PATH = path.join(app.getPath('userData'), 'avocado.sqlite');

  const serverEntry = path.join(app.getAppPath(), 'build', 'server', 'main.js');
  const serverModule = require(serverEntry) as LocalServerModule;

  localServer = await serverModule.bootstrap({
    hostname: '127.0.0.1',
    port: 0,
  });

  return Number(new URL(await localServer.getUrl()).port);
};

const createMainWindow = async (apiPort: number): Promise<void> => {
  mainWindow = new BrowserWindow({
    height: 900,
    icon: path.join(app.getAppPath(), 'build', 'client', 'favicon.png'),
    minHeight: 600,
    minWidth: 900,
    show: false,
    title: 'Avocado',
    width: 1440,
    webPreferences: {
      additionalArguments: [`--avocado-api-port=${apiPort}`],
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadFile(
    path.join(app.getAppPath(), 'build', 'client', 'index.html'),
  );
};

const startApplication = async (): Promise<void> => {
  try {
    Menu.setApplicationMenu(null);
    const apiPort = await startLocalServer();
    await createMainWindow(apiPort);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Не удалось запустить Avocado', message);
    app.quit();
  }
};

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  void app.whenReady().then(startApplication);
}

app.on('activate', () => {
  if (mainWindow === null && localServer !== null) {
    void localServer
      .getUrl()
      .then((url) => createMainWindow(Number(new URL(url).port)));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (localServer === null || isClosingServer) return;

  event.preventDefault();
  isClosingServer = true;

  void localServer.close().finally(() => {
    localServer = null;
    app.quit();
  });
});
