import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../../../../resources/icon.svg'

const StartPage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Initializing...')

  window.EXCALIDRAW_ASSET_PATH = './src/assets'

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Simulate loading delay for better UX
        setLoadingText('Checking configuration...')
        await new Promise((resolve) => setTimeout(resolve, 800))

        // Check if onboarding is completed
        let onboardingCompleted = false
        let vaultPath = ''
        if (window.api?.store) {
          onboardingCompleted = await window.api.store.get('onboardingCompleted')
          vaultPath = await window.api.store.get('vaultPath')
        }

        setLoadingText('Setting up workspace...')

        // Navigate based on onboarding status
        if (onboardingCompleted && vaultPath) {
          setLoadingText('Loading library...')

          navigate('/library', { replace: true })
        } else {
          setLoadingText('Starting setup...')

          navigate('/onboarding', { replace: true })
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // Default to onboarding on error
        navigate('/onboarding', { replace: true })
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [navigate])

  return (
    <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-primary/3 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-primary/3 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      <div className="relative flex flex-col items-center space-y-8">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <img src={Logo} alt="Excalidraw Logo" className="w-12 h-12" />
          </div>

          {/* Pulsing ring around logo */}
          <div className="absolute inset-0 w-20 h-20 border-2 border-primary/20 rounded-2xl animate-ping"></div>
        </div>

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Excalidraw Desktop</h1>
          <p className="text-text-secondary">Your creative canvas awaits</p>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Main loading spinner */}
            <div className="w-12 h-12 border-3 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>

            {/* Secondary ring */}
            <div className="absolute inset-1 w-10 h-10 border-2 border-primary/10 rounded-full"></div>
            <div
              className="absolute inset-1 w-10 h-10 border-2 border-primary/30 border-b-transparent rounded-full animate-spin animate-reverse"
              style={{ animationDuration: '2s' }}
            ></div>
          </div>

          {/* Loading text */}
          <div className="text-center">
            <p className="text-text-primary font-medium mb-1">{loadingText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartPage
