import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  store: {
    get(key) {
      return ipcRenderer.sendSync('electron-store-get', key)
    },
    set(property, val) {
      ipcRenderer.send('electron-store-set', property, val)
    }
  },
  getDocumentsPath: () => {
    return ipcRenderer.invoke('get-documents-path')
  },
  saveDrawing: (data, filename) => ipcRenderer.invoke('drawings:save', data, filename),
  loadDrawing: (filename) => ipcRenderer.invoke('drawings:load', filename),
  listDrawings: () => ipcRenderer.invoke('drawings:list'),
  deleteDrawing: (filename) => ipcRenderer.invoke('drawings:delete', filename),
  duplicateDrawing: (filename) => ipcRenderer.invoke('drawings:duplicate', filename),
  renameDrawing: (oldFilename, newFilename) =>
    ipcRenderer.invoke('drawings:rename', oldFilename, newFilename),
  importDrawings: (filePaths) => ipcRenderer.invoke('drawings:import', filePaths),
  dialog: {
    showOpenDialog: (operation) => {
      return ipcRenderer.invoke('dialog:showOpenDialog', operation)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    contextBridge.exposeInMainWorld('darkMode', {
      toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
      system: () => ipcRenderer.invoke('dark-mode:system')
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
