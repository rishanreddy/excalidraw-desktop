import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Save, AlertCircle, CheckCircle, HardDrive } from 'lucide-react'
import { toast } from 'sonner'

const SettingsPage = () => {
  const navigate = useNavigate()
  const [vaultPath, setVaultPath] = useState('')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      if (window.api?.store) {
        const savedVaultPath = (await window.api.store.get('vaultPath')) || ''
        setVaultPath(savedVaultPath)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaveStatus('saving')
    try {
      if (window.api?.store) {
        await window.api.store.set('vaultPath', vaultPath)
      }
      setUnsavedChanges(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
      toast.error('Failed to save settings')
    }
  }

  const selectVaultFolder = async () => {
    try {
      if (window.api?.dialog?.showOpenDialog) {
        const result = await window.api.dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
          title: 'Select Vault Location',
          buttonLabel: 'Select Folder',
          defaultPath: vaultPath
        })
        if (!result.canceled && result.filePaths?.length > 0) {
          setVaultPath(result.filePaths[0])
          setUnsavedChanges(true)
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
      toast.error('Unable to open folder picker')
    }
  }

  const openVaultFolder = async () => {
    if (window.api?.shell?.openPath && vaultPath) {
      await window.api.shell.openPath(vaultPath)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-primary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/library')}
              className="p-2 text-text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          </div>

          <div className="flex items-center space-x-3">
            {saveStatus && (
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${
                  saveStatus === 'saved'
                    ? 'bg-green-50 text-green-700'
                    : saveStatus === 'saving'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'
                }`}
              >
                {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
                {saveStatus === 'saving' && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                <span>
                  {saveStatus === 'saved'
                    ? 'Settings saved'
                    : saveStatus === 'saving'
                      ? 'Saving...'
                      : 'Error saving settings'}
                </span>
              </div>
            )}

            {unsavedChanges && (
              <button
                onClick={saveSettings}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-2 bg-primary hover:bg-primary-darker disabled:bg-text-secondary disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {unsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">You have unsaved changes</p>
            </div>
          )}

          {/* Vault Location */}
          <div className="bg-bg-primary border border-border rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <HardDrive className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Vault Location</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Choose where your drawings will be stored
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  readOnly
                  value={vaultPath}
                  className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono text-sm"
                  placeholder="No vault location set"
                />
                <button
                  onClick={selectVaultFolder}
                  className="px-6 py-3 bg-primary hover:bg-primary-darker text-white rounded-lg transition-colors font-medium"
                >
                  Browse
                </button>
                {vaultPath && (
                  <button
                    onClick={openVaultFolder}
                    className="px-4 py-3 bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary rounded-lg transition-colors"
                    title="Open in file explorer"
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">About Vault Location</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This is the folder where all your Excalidraw files will be saved. You can
                      change this location at any time, but existing files won't be moved
                      automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SettingsPage
