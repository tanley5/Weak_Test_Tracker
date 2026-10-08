import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  nativeTheme,
  screen,
  shell,
} from 'electron'
import { join } from 'path'
import { openDatabase, type WeakTrackerDb } from './db'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let db: WeakTrackerDb | null = null
let suppressNextFocusExpand = false

function isDev(): boolean {
  return !app.isPackaged
}

function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function windowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#0f1419' : '#f2f5f3'
}

function syncWindowChromeTheme(): void {
  const color = windowBackgroundColor()
  mainWindow?.setBackgroundColor(color)
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 860,
    minHeight: 600,
    title: 'Weak-Area Tracker',
    backgroundColor: windowBackgroundColor(),
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('Main window failed to load', { code, desc, url })
  })

  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function widgetBounds(expanded: boolean): {
  width: number
  height: number
  x: number
  y: number
} {
  const display = screen.getPrimaryDisplay()
  const { width: sw } = display.workAreaSize
  const { x: wx, y: wy } = display.workArea
  const width = expanded ? 320 : 148
  const height = expanded ? 240 : 48
  return {
    width,
    height,
    x: wx + sw - width - 24,
    y: wy + 16,
  }
}

function resizeWidget(expanded: boolean): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  widgetWindow.setBounds(widgetBounds(expanded), true)
}

function createWidgetWindow(): void {
  const bounds = widgetBounds(false)
  widgetWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    // Opaque floating panel — transparent windows often paint blank on macOS
    transparent: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a222c' : '#ffffff',
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: true,
    show: false,
    focusable: true,
    type: process.platform === 'darwin' ? 'panel' : 'toolbar',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  widgetWindow.setAlwaysOnTop(true, 'screen-saver')
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  widgetWindow.once('ready-to-show', () => {
    widgetWindow?.showInactive()
  })

  widgetWindow.on('focus', () => {
    if (suppressNextFocusExpand) {
      suppressNextFocusExpand = false
      return
    }
    resizeWidget(true)
    widgetWindow?.webContents.send('widget:expand')
  })

  widgetWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('Widget failed to load', { code, desc, url })
  })

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    widgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html`)
  } else {
    widgetWindow.loadFile(join(__dirname, '../renderer/widget.html'))
  }
}

function expandWidget(): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow()
  }
  suppressNextFocusExpand = true
  resizeWidget(true)
  widgetWindow?.show()
  widgetWindow?.focus()
  widgetWindow?.webContents.send('widget:expand')
}

function syncWidgetChromeTheme(): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  widgetWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1a222c' : '#ffffff')
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'

  try {
    const dbPath = join(app.getPath('userData'), 'weak-tracker.db')
    db = openDatabase(dbPath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Failed to open database', err)
    dialog.showErrorBox(
      'Weak-Area Tracker failed to start',
      `Could not open the local database.\n\n${message}\n\nIf you just ran tests, run: npm run rebuild:electron\nThen start the app with: npm run dev`,
    )
    app.quit()
    return
  }

  registerIpc(db, expandWidget)

  ipcMain.on('widget:collapsed', () => resizeWidget(false))
  ipcMain.on('widget:expanded', () => resizeWidget(true))

  createMainWindow()
  createWidgetWindow()

  nativeTheme.on('updated', () => {
    syncWindowChromeTheme()
    syncWidgetChromeTheme()
  })

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    expandWidget()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createWidgetWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  db?.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
