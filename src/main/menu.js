import { app, Menu, shell, BrowserWindow } from 'electron'

export default class MenuBuilder {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
  }

  buildMenu() {
    const template =
      process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate()

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    return menu
  }

  buildDarwinTemplate() {
    return [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      this.buildFileMenu(),
      this.buildEditMenu(),
      this.buildViewMenu(),
      this.buildHelpMenu()
    ]
  }

  buildDefaultTemplate() {
    return [this.buildFileMenu(), this.buildEditMenu(), this.buildViewMenu(), this.buildHelpMenu()]
  }

  buildFileMenu() {
    return {
      label: 'File',
      submenu: [
        {
          label: 'New Drawing',
          accelerator: 'CmdOrCtrl+N',
          click: () => this.mainWindow.webContents.send('menu-new')
        },
        {
          label: 'Save Drawing',
          accelerator: 'CmdOrCtrl+S',
          click: () => this.mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Export as PNG',
          click: () => this.mainWindow.webContents.send('menu-export')
        },
        { type: 'separator' },
        {
          label: 'Close',
          role: 'close'
        }
      ]
    }
  }

  buildEditMenu() {
    return {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  }

  buildViewMenu() {
    return {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          }
        }
      ]
    }
  }

  buildHelpMenu() {
    return {
      label: 'Help',
      submenu: [
        {
          label: 'Excalidraw Website',
          click: () => shell.openExternal('https://excalidraw.com')
        },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/excalidraw/excalidraw')
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/excalidraw/excalidraw/issues')
        }
      ]
    }
  }
}
