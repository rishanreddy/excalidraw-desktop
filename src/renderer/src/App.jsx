import { MemoryRouter as Router, Routes, Route } from 'react-router-dom'
import WhiteboardPage from './components/editor'
import DrawingLibraryPage from './components/home'
import OnboardingPage from './components/onboard'
import SettingsPage from './components/settings'
import StartPage from './components/start'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/library" element={<DrawingLibraryPage />} />
          <Route path="/editor" element={<WhiteboardPage />} />
          <Route path="/editor/:id" element={<WhiteboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
      <Toaster richColors />
    </>
  )
}
