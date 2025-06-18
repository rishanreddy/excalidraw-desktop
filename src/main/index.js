import { app, shell, BrowserWindow, ipcMain, nativeImage, nativeTheme, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import path from 'path'
import MenuBuilder from './menu'
import Store from 'electron-store'
import * as fs from 'fs'

const store = new Store()

// store.set('onboardingCompleted', false)

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'resources')
  : path.join(__dirname, '../../resources')

const getAssetPath = (...paths) => {
  return path.join(RESOURCES_PATH, ...paths)
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDebug) {
  require('electron-debug').default()
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS']

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log)
}

async function createWindow() {
  if (isDebug) {
    await installExtensions()
  }
  // Create the browser window.
  let mainWindow = null
  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 728,
    minHeight: 600,
    minWidth: 1200,
    title: 'Excalidraw Desktop',
    movable: true,
    resizable: true,
    fullscreen: false,
    fullscreenable: true,
    minimizable: true,
    icon: getAssetPath('icon.png'),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const image = nativeImage.createFromPath(getAssetPath('icons/100x100.png'))

  mainWindow.setIcon(image)
  app.dock.setIcon(image)

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize()
    } else {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.setAboutPanelOptions({
  applicationName: 'Excalidraw Desktop',
  version: app.getVersion(),
  authors: ['Rishan Reddy'],
  website: 'https://github.com/rishanreddy/excalidraw-desktop',
  applicationVersion: app.getVersion()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.excalidraw.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('electron-store-get', async (event, val) => {
    event.returnValue = store.get(val)
  })
  ipcMain.on('electron-store-set', async (event, key, val) => {
    store.set(key, val)
  })

  ipcMain.handle('drawings:save', async (event, data, filename) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'

      // Ensure .excalidraw extension
      const filenameWithExt = filename.endsWith('.excalidraw') ? filename : `${filename}.excalidraw`

      const filePath = path.join(vaultDir, filenameWithExt)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

      console.log(`Drawing saved: ${filenameWithExt}`)
      return { success: true, filePath, filename: filenameWithExt }
    } catch (error) {
      console.error('Error saving drawings:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('drawings:load', async (event, filename) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      console.log('Vault Directory:', vaultDir)
      console.log('Filename:', filename)
      const filePath = path.join(vaultDir, filename)
      console.log('Full file path:', filePath)
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        console.log('Loaded drawing:', filename)
        console.log('Content length:', content.length)
        console.log('Content preview:', content.slice(0, 100)) // Preview first 100 characters
        return JSON.parse(content)
      } else {
        console.log('File does not exist:', filePath)
      }
      return null
    } catch (error) {
      console.error('Error loading drawings:', error)
      return null
    }
  })

  ipcMain.handle('drawings:list', async (event) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true })
      const files = fs.readdirSync(vaultDir)

      const drawings = files
        .filter((file) => file.endsWith('.excalidraw'))
        .map((file) => {
          const filePath = path.join(vaultDir, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            filePath: filePath,
            lastModified: stats.mtime,
            size: stats.size
          }
        })
      return drawings
    } catch (error) {
      console.error('Error listing drawings:', error)
      return []
    }
  })

  ipcMain.handle('drawings:delete', async (event, filename) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      const filePath = path.join(vaultDir, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Successfully deleted drawing: ${filename}`)
        return { success: true }
      } else {
        console.log(`File does not exist: ${filePath}`)
        return { success: false, error: 'File does not exist' }
      }
    } catch (error) {
      console.error('Error deleting drawing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dialog:showOpenDialog', async (event, operation) => {
    const properties =
      operation === 'export'
        ? ['openDirectory', 'createDirectory']
        : ['openDirectory', 'createDirectory', 'promptToCreate']
    const result = await dialog.showOpenDialog({
      properties: properties,
      title: 'Select or Create Vault Location',
      buttonLabel: 'Select Folder',
      defaultPath: store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
    })
    if (result.canceled) {
      return null
    } else {
      return result.filePaths[0]
    }
  })

  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })

  ipcMain.handle('get-documents-path', () => {
    return app.getPath('documents') // e.g., /Users/you/Documents
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
