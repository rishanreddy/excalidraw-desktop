import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import '@excalidraw/excalidraw/index.css'

import { Excalidraw, MainMenu, WelcomeScreen, serializeAsJSON } from '@excalidraw/excalidraw'
import Logo from '../../../../resources/icon.svg'
import { Home, Link, AlertTriangle, Save, X, FileText, Download, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

export default function WhiteboardPage() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSceneJSON, setLastSceneJSON] = useState(null)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [currentFileName, setCurrentFileName] = useState('')
  const [isNewFile, setIsNewFile] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filePath, setFilePath] = useState(searchParams.get('file') || '')

  const autoSaveTimer = useRef(null)
  const saveInProgress = useRef(false)

  // Initialize editor and load settings
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        window.EXCALIDRAW_ASSET_PATH = './src/assets'

        if (filePath) {
          setIsNewFile(false)
          setCurrentFileName(filePath.replace('.excalidraw', ''))
        } else {
          setIsNewFile(true)
          setCurrentFileName('Untitled Drawing')
        }

        setLoading(false)
      } catch (err) {
        console.error('Error initializing editor:', err)
        setError('Failed to initialize editor')
      }
    }
    initializeEditor()
  }, [filePath])

  // Handle API init and file load
  useEffect(() => {
    if (!excalidrawAPI) return
    if (filePath && !isNewFile) {
      loadDrawingFromFile(filePath)
    } else {
      setLoading(false)
    }
  }, [excalidrawAPI, filePath, isNewFile])

  // Auto-save setup
  useEffect(() => {
    if (!excalidrawAPI || isNewFile) {
      clearInterval(autoSaveTimer.current)
      return
    }

    const setupAutoSave = async () => {
      try {
        if (window.api?.store) {
          const enabled = await window.api.store.get('autoSave')
          const interval = (await window.api.store.get('autoSaveInterval')) || 30

          if (enabled) {
            clearInterval(autoSaveTimer.current)
            autoSaveTimer.current = setInterval(() => {
              if (isDirty && !saveInProgress.current) {
                handleAutoSave()
              }
            }, interval * 1000)
          }
        }
      } catch (err) {
        console.error('Error setting up auto-save:', err)
      }
    }

    setupAutoSave()
    return () => clearInterval(autoSaveTimer.current)
  }, [excalidrawAPI, isNewFile, isDirty])

  // Keyboard: Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!saving) handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving])

  // Warn on unload if dirty
  useEffect(() => {
    const onBefore = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [isDirty])

  const loadDrawingFromFile = async (name) => {
    if (!excalidrawAPI) return
    setError(null)

    try {
      const resp = await window.api.loadDrawing(name)
      if (!resp) throw new Error('No data received')

      const { elements = [], appState = {} } = JSON.parse(resp)
      excalidrawAPI.updateScene({ elements, appState })
      excalidrawAPI.scrollToContent()

      const json = serializeAsJSON(elements, appState, 'local')
      setLastSceneJSON(json)
      setIsDirty(false)
      setLastSaved(new Date())
    } catch (err) {
      console.error('Error loading drawing:', err)
      setError(`Failed to load drawing: ${err.message}`)
      toast.error('Failed to load drawing: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = useCallback(
    (elements, appState) => {
      if (!excalidrawAPI) return
      const sceneJSON = serializeAsJSON(elements, appState, 'local')
      setIsDirty(sceneJSON !== lastSceneJSON)
    },
    [excalidrawAPI, lastSceneJSON]
  )

  const handleAutoSave = async () => {
    if (!excalidrawAPI || isNewFile || saveInProgress.current) return
    saveInProgress.current = true

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const json = serializeAsJSON(elements, appState, 'local')
      const resp = await window.api.saveDrawing(json, currentFileName + '.excalidraw')

      if (resp?.success) {
        setLastSceneJSON(json)
        setIsDirty(false)
        setLastSaved(new Date())
        toast.success('Auto-saved', { duration: 1000 })
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
    } finally {
      saveInProgress.current = false
    }
  }

  const handleSave = async () => {
    if (!excalidrawAPI || saving) return
    setSaving(true)
    setError(null)

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const json = serializeAsJSON(elements, appState, 'local')

      let resp
      if (isNewFile) {
        const now = new Date()
        const ts =
          now.toISOString().split('T')[0] +
          '_' +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0')
        const name = `Drawing_${ts}`
        resp = await window.api.saveDrawing(json, name + '.excalidraw')
        if (resp?.success) {
          setCurrentFileName(name)
          setIsNewFile(false)
          setFilePath(name + '.excalidraw')
          window.history.replaceState(
            {},
            '',
            `/editor?file=${encodeURIComponent(name + '.excalidraw')}`
          )
        }
      } else {
        resp = await window.api.saveDrawing(json, currentFileName + '.excalidraw')
      }

      if (!resp?.success) throw new Error(resp?.error || 'Save failed')

      setLastSceneJSON(json)
      setIsDirty(false)
      setLastSaved(new Date())
      toast.success('Drawing saved successfully!')

      if (showExitDialog) {
        setShowExitDialog(false)
        navigate('/library')
      }
    } catch (err) {
      console.error('Error saving:', err)
      setError(`Failed to save: ${err.message}`)
      toast.error('Failed to save drawing: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAs = async () => {
    if (!excalidrawAPI || saving) return
    setSaving(true)

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const json = serializeAsJSON(elements, appState, 'local')

      const now = new Date()
      const ts =
        now.toISOString().split('T')[0] +
        '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0')
      const newName = `${currentFileName}_copy_${ts}`
      const resp = await window.api.saveDrawing(json, newName + '.excalidraw')
      if (!resp?.success) throw new Error(resp?.error || 'Save As failed')

      setCurrentFileName(newName)
      setIsNewFile(false)
      setFilePath(newName + '.excalidraw')
      setLastSceneJSON(json)
      setIsDirty(false)
      setLastSaved(new Date())
      window.history.replaceState(
        {},
        '',
        `/editor?file=${encodeURIComponent(newName + '.excalidraw')}`
      )
      toast.success('Drawing saved as new file!')
    } catch (err) {
      console.error('Error saving as new file:', err)
      toast.error('Failed to save as new file: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (type = 'png') => {
    if (!excalidrawAPI) return

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      if (elements.length === 0) {
        toast.error('Nothing to export - canvas is empty')
        return
      }

      const { exportToCanvas, exportToSvg } = await import('@excalidraw/excalidraw')
      let blob

      if (type === 'svg') {
        const svg = await exportToSvg({
          elements,
          appState,
          files: excalidrawAPI.getFiles(),
          exportPadding: 20
        })
        blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
      } else {
        const canvas = await exportToCanvas({
          elements,
          appState,
          files: excalidrawAPI.getFiles(),
          exportPadding: 20
        })
        blob = await new Promise((res) => canvas.toBlob(res, `image/${type}`, 0.9))
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentFileName}.${type}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported as ${type.toUpperCase()}`)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export drawing')
    }
  }

  const handleNavigateHome = () => {
    if (isDirty) setShowExitDialog(true)
    else navigate('/library')
  }
  const handleForceExit = () => {
    setShowExitDialog(false)
    navigate('/library')
  }
  const handleCancelExit = () => setShowExitDialog(false)

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {filePath ? 'Loading Drawing' : 'Initializing Editor'}
            </h3>
            <p className="text-text-secondary">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !excalidrawAPI) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-text-primary mb-2">Failed to Load</h3>
          <p className="text-text-secondary mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-darker text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/library')}
              className="bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary px-4 py-2 rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen relative">
      <Suspense
        fallback={
          <div className="w-screen h-screen flex items-center justify-center bg-bg-primary">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Loading Excalidraw</h3>
                <p className="text-text-secondary">Preparing your canvas...</p>
              </div>
            </div>
          </div>
        }
      >
        <Excalidraw
          excalidrawAPI={(api) => {
            setExcalidrawAPI(api)
          }}
          onChange={handleChange}
          renderTopRightUI={() => (
            <div className="flex items-center gap-3 mr-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm">
                <FileText className="w-4 h-4 text-text-secondary" />
                <span
                  className="text-text-primary font-medium truncate max-w-32"
                  title={currentFileName}
                >
                  {currentFileName}
                </span>
                {isDirty && <div className="w-2 h-2 bg-primary rounded-full" />}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (!isDirty && !isNewFile)}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-darker disabled:opacity-50 text-white rounded-lg shadow-sm transition-all font-medium text-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>

              <button
                onClick={handleNavigateHome}
                className="flex items-center gap-1.5 px-3 py-2 bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary rounded-lg font-medium text-sm"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>
          )}
        >
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Logo>
                <div className="w-20 h-20 mx-auto mb-2 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <img src={Logo} alt="Logo" className="w-12 h-12" />
                </div>
              </WelcomeScreen.Center.Logo>
              <WelcomeScreen.Center.Heading>
                <h1 className="text-3xl font-bold text-text-primary mt-4 mb-2">
                  Welcome to Excalidraw Desktop
                </h1>
                <p className="text-base text-text-secondary max-w-md mx-auto leading-relaxed">
                  Create diagrams, sketches, and wireframes with our powerful drawing tools.
                </p>
              </WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <WelcomeScreen.Center.MenuItemHelp />
                  <WelcomeScreen.Center.MenuItemLink
                    href="https://github.com/rishanreddy/excalidraw-desktop"
                    shortcut="G"
                  >
                    GitHub Repository
                  </WelcomeScreen.Center.MenuItemLink>
                </div>
              </WelcomeScreen.Center.Menu>

              <WelcomeScreen.Hints.ToolbarHint>
                <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
                  <p className="text-sm text-text-primary font-medium">
                    Pick a tool and start drawing
                  </p>
                </div>
              </WelcomeScreen.Hints.ToolbarHint>
              <WelcomeScreen.Hints.HelpHint>
                <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
                  <p className="text-sm text-text-primary">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 bg-bg-primary rounded text-xs font-mono border border-border">
                      ?
                    </kbd>{' '}
                    for shortcuts
                  </p>
                </div>
              </WelcomeScreen.Hints.HelpHint>
              <WelcomeScreen.Hints.MenuHint>
                <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border">
                  <p className="text-sm text-text-primary">
                    Access export, preferences, and more from the menu
                  </p>
                </div>
              </WelcomeScreen.Hints.MenuHint>
            </WelcomeScreen.Center>
          </WelcomeScreen>

          <MainMenu>
            <MainMenu.Item onSelect={handleNavigateHome} icon={<Home className="w-4 h-4" />}>
              Back to Library
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={handleSave}
              icon={
                saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />
              }
              disabled={saving}
            >
              {saving ? 'Saving...' : `Save ${isNewFile ? 'as New File' : 'Current File'}`}
            </MainMenu.Item>
            <MainMenu.Item onSelect={handleSaveAs} icon={<FileText className="w-4 h-4" />}>
              Save as Copy
            </MainMenu.Item>
            <MainMenu.Separator />
            <MainMenu.Item
              onSelect={() => handleExport('png')}
              icon={<Download className="w-4 h-4" />}
            >
              Export as PNG
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={() => handleExport('svg')}
              icon={<Download className="w-4 h-4" />}
            >
              Export as SVG
            </MainMenu.Item>
            <MainMenu.Item
              onSelect={() => handleExport('jpg')}
              icon={<Download className="w-4 h-4" />}
            >
              Export as JPG
            </MainMenu.Item>
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.Help />
            <MainMenu.ItemLink
              href="https://github.com/rishanreddy/excalidraw-desktop"
              shortcut="G"
              icon={<Link className="w-4 h-4" />}
            >
              GitHub
            </MainMenu.ItemLink>
            <MainMenu.ItemLink href="https://excalidraw.com" icon={<Link className="w-4 h-4" />}>
              Website
            </MainMenu.ItemLink>
          </MainMenu>
        </Excalidraw>
      </Suspense>

      {showExitDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl shadow-2xl border border-border w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    You have unsaved changes
                  </h3>
                  <p className="text-text-secondary mb-6 leading-relaxed">
                    Your drawing "{currentFileName}" contains unsaved changes. Would you like to
                    save before leaving?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center space-x-2 flex-1 px-4 py-3 bg-primary hover:bg-primary-darker disabled:bg-primary/50 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{saving ? 'Saving...' : 'Save & Exit'}</span>
                    </button>
                    <button
                      onClick={handleForceExit}
                      disabled={saving}
                      className="flex items-center justify-center space-x-2 flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                      <span>Don't Save</span>
                    </button>
                  </div>
                  <button
                    onClick={handleCancelExit}
                    disabled={saving}
                    className="w-full mt-3 px-4 py-3 bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    Continue Editing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
