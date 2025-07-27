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

          // Generate thumbnail data
          let thumbnail = null
          try {
            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)
            const elements = data.elements || []

            // Create a simple thumbnail representation
            if (elements.length > 0) {
              const elementTypes = [...new Set(elements.map((el) => el.type))]
              const hasText = elementTypes.includes('text')
              const hasShapes = elementTypes.some((type) =>
                ['rectangle', 'ellipse', 'diamond', 'triangle'].includes(type)
              )
              const hasLines = elementTypes.some((type) => ['line', 'arrow', 'draw'].includes(type))

              thumbnail = {
                elementCount: elements.length,
                hasText,
                hasShapes,
                hasLines,
                elementTypes
              }
            }
          } catch (e) {
            // If we can't read the file for thumbnail, that's okay
            console.warn('Could not generate thumbnail for', file, e.message)
          }

          return {
            name: file,
            filePath: filePath,
            lastModified: stats.mtime,
            size: stats.size,
            thumbnail
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

  ipcMain.handle('drawings:duplicate', async (event, filename) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      const sourceFilePath = path.join(vaultDir, filename)

      if (!fs.existsSync(sourceFilePath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      // Generate new filename
      const baseName = filename.replace('.excalidraw', '')
      const now = new Date()
      const timestamp =
        now.toISOString().split('T')[0] +
        '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0')
      const newFileName = `${baseName}_copy_${timestamp}.excalidraw`
      const newFilePath = path.join(vaultDir, newFileName)

      // Copy file
      fs.copyFileSync(sourceFilePath, newFilePath)

      console.log(`Successfully duplicated drawing: ${filename} -> ${newFileName}`)
      return { success: true, newFileName }
    } catch (error) {
      console.error('Error duplicating drawing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('drawings:rename', async (event, oldFilename, newFilename) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      const oldFilePath = path.join(vaultDir, oldFilename)

      // Ensure new filename has .excalidraw extension
      const finalNewFilename = newFilename.endsWith('.excalidraw')
        ? newFilename
        : `${newFilename}.excalidraw`
      const newFilePath = path.join(vaultDir, finalNewFilename)

      if (!fs.existsSync(oldFilePath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      if (fs.existsSync(newFilePath) && oldFilePath !== newFilePath) {
        return { success: false, error: 'A file with that name already exists' }
      }

      fs.renameSync(oldFilePath, newFilePath)

      console.log(`Successfully renamed drawing: ${oldFilename} -> ${finalNewFilename}`)
      return { success: true, newFilename: finalNewFilename }
    } catch (error) {
      console.error('Error renaming drawing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dialog:showOpenDialog', async (event, operation) => {
    const properties =
      operation === 'export'
        ? ['openDirectory', 'createDirectory']
        : operation === 'import-files'
          ? ['openFile', 'multiSelections']
          : ['openDirectory', 'createDirectory', 'promptToCreate']

    const filters =
      operation === 'import-files'
        ? [
            { name: 'Excalidraw Files', extensions: ['excalidraw'] },
            { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        : []

    const result = await dialog.showOpenDialog({
      properties: properties,
      filters: filters,
      title:
        operation === 'import-files' ? 'Select Files to Import' : 'Select or Create Vault Location',
      buttonLabel: operation === 'import-files' ? 'Import' : 'Select Folder',
      defaultPath: store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
    })
    if (result.canceled) {
      return null
    } else {
      return operation === 'import-files' ? result.filePaths : result.filePaths[0]
    }
  })

  ipcMain.handle('drawings:import', async (event, filePaths) => {
    try {
      const vaultDir = store.get('vaultPath') || app.getPath('documents') + '/Excalidraw_Vault'
      if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true })

      const results = []

      for (const filePath of filePaths) {
        try {
          const fileName = path.basename(filePath)
          const ext = path.extname(fileName).toLowerCase()

          if (ext === '.excalidraw') {
            // Import .excalidraw file directly
            const targetPath = path.join(vaultDir, fileName)
            let finalName = fileName

            // Handle name conflicts
            if (fs.existsSync(targetPath)) {
              const baseName = fileName.replace('.excalidraw', '')
              const timestamp =
                new Date().toISOString().split('T')[0] +
                '_' +
                new Date().getHours().toString().padStart(2, '0') +
                new Date().getMinutes().toString().padStart(2, '0')
              finalName = `${baseName}_imported_${timestamp}.excalidraw`
            }

            const finalPath = path.join(vaultDir, finalName)
            fs.copyFileSync(filePath, finalPath)
            results.push({ success: true, fileName: finalName, type: 'excalidraw' })
          } else if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) {
            // For images, create a new excalidraw file with the image as background
            const baseName = fileName.replace(ext, '')
            const timestamp =
              new Date().toISOString().split('T')[0] +
              '_' +
              new Date().getHours().toString().padStart(2, '0') +
              new Date().getMinutes().toString().padStart(2, '0')
            const drawingName = `${baseName}_imported_${timestamp}.excalidraw`

            // Read image file and convert to base64
            const imageBuffer = fs.readFileSync(filePath)
            const base64 = imageBuffer.toString('base64')
            const mimeType = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`
            const dataURL = `data:${mimeType};base64,${base64}`

            // Create basic excalidraw structure with image
            const excalidrawData = {
              type: 'excalidraw',
              version: 2,
              source: 'https://excalidraw.com',
              elements: [
                {
                  id: 'imported-image-' + Date.now(),
                  type: 'image',
                  x: 100,
                  y: 100,
                  width: 400,
                  height: 300,
                  angle: 0,
                  strokeColor: 'transparent',
                  backgroundColor: 'transparent',
                  fillStyle: 'hachure',
                  strokeWidth: 1,
                  strokeStyle: 'solid',
                  roughness: 1,
                  opacity: 100,
                  roundness: null,
                  seed: Math.floor(Math.random() * 1000000),
                  versionNonce: Math.floor(Math.random() * 1000000),
                  isDeleted: false,
                  boundElements: null,
                  updated: 1,
                  link: null,
                  locked: false,
                  fileId: 'imported-file-' + Date.now(),
                  scale: [1, 1]
                }
              ],
              appState: {
                gridSize: null,
                viewBackgroundColor: '#ffffff'
              },
              files: {
                ['imported-file-' + Date.now()]: {
                  mimeType: mimeType,
                  id: 'imported-file-' + Date.now(),
                  dataURL: dataURL,
                  created: Date.now()
                }
              }
            }

            const targetPath = path.join(vaultDir, drawingName)
            fs.writeFileSync(targetPath, JSON.stringify(excalidrawData, null, 2), 'utf-8')
            results.push({ success: true, fileName: drawingName, type: 'image' })
          } else {
            results.push({ success: false, fileName, error: 'Unsupported file type' })
          }
        } catch (error) {
          results.push({ success: false, fileName: path.basename(filePath), error: error.message })
        }
      }

      return { success: true, results }
    } catch (error) {
      console.error('Error importing files:', error)
      return { success: false, error: error.message }
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
