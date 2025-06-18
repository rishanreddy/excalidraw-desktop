import { useState, useEffect } from 'react'
import { Folder, Info, LaptopMinimal } from 'lucide-react'
import Logo from '../../../../resources/icon.svg'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const OnboardingPage = () => {
  const [vaultPath, setVaultPath] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const setDefaultPath = async () => {
      try {
        if (window.api?.getDocumentsPath) {
          const documentsPath = await window.api.getDocumentsPath()
          setVaultPath(`${documentsPath}/Excalidraw_Vault`)
        } else {
          setVaultPath('/Users/Documents/Excalidraw_Vault')
        }
      } catch (error) {
        console.error('Error getting documents path:', error)
        setVaultPath('/Users/Documents/Excalidraw Vault')
      }
    }

    const init = async () => {
      await setDefaultPath()
      const completedOnboarding = window.api?.store?.get('onboardingCompleted')
      if (completedOnboarding) {
        navigate('/library')
      }
    }

    init()
  }, [navigate])

  const handleContinue = async () => {
    if (!vaultPath.trim()) {
      alert('Please select a vault location.')
      return
    }

    try {
      if (window.api?.store) {
        await window.api.store.set('onboardingCompleted', true)
        await window.api.store.set('themePreference', 'light')
        await window.api.store.set('vaultPath', vaultPath)
      }

      navigate('/library')
    } catch (error) {
      console.error('Error saving onboarding settings:', error)
      alert('There was an error saving your settings. Please try again.')
    }
  }

  const handleSelectFolder = async () => {
    try {
      if (window.api?.dialog?.showOpenDialog) {
        const result = await window.api.dialog.showOpenDialog('findingVaultLoc')
        if (result !== null) {
          setVaultPath(result)
        } else {
          toast.error('No folder selected. Please try again.')
        }
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.onchange = (e) => {
          if (e.target.files?.length > 0) {
            setVaultPath(
              e.target.files[0].path || e.target.files[0].webkitRelativePath.split('/')[0]
            )
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
      alert('Unable to open folder picker. Please try again.')
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 bg-[theme('colors.background')] text-[theme('colors.foreground')]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[theme('colors.primary')]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[theme('colors.primary')]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[theme('colors.primary')] rounded-2xl flex items-center justify-center shadow-lg">
            <img src={Logo} alt="Excalidraw Logo" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Excalidraw Desktop</h1>
          <p className="text-gray-500">
            Let's get you set up by selecting where to store your drawings
          </p>
        </div>

        <div className="bg-primary-light backdrop-blur-xl rounded-2xl shadow-xl border border-border p-6">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Choose Vault Location</h2>
              <p className="text-sm text-gray-500">Select where your drawings will be stored</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  placeholder="Click to select vault location"
                  className="w-full pl-4 pr-12 py-3 bg-gray-100 border border-primary rounded-lg text-sm font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  value={vaultPath}
                  onClick={handleSelectFolder}
                  title={vaultPath || 'Click to browse for folder'}
                  style={{ textOverflow: 'ellipsis' }}
                />
                <button
                  onClick={handleSelectFolder}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary"
                  title="Browse folders"
                >
                  <Folder className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-primary border border-primary-light/20 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div>
                    <p className="text-xs font-medium text-white">Choose a memorable location</p>
                    <p className="text-xs text-gray-200 mt-1">
                      This folder will store all your drawings and settings. Click the input field
                      or folder icon to browse and create folders.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6 pt-6">
              <button
                onClick={handleContinue}
                disabled={!vaultPath.trim()}
                className="px-8 py-3 bg-primary hover:bg-primary-darker disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            You can change the vault location later in preferences
          </p>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
