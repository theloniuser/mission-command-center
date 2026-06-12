import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { BrandProvider } from './context/BrandContext.jsx'
import { SessionProvider, useSession } from './context/SessionContext.jsx'
import Header from './components/layout/Header.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import LauncherModal from './components/modals/LauncherModal.jsx'
import BrainCaptureModal from './components/modals/BrainCaptureModal.jsx'

function AppLayout() {
  const {
    launcherOpen, launcherBead, closeLauncher,
    brainOpen, openBrain, closeBrain,
  } = useSession()

  return (
    <>
      <Header onBrainCapture={openBrain} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <LauncherModal isOpen={launcherOpen} initialBead={launcherBead} onClose={closeLauncher} />
      <BrainCaptureModal isOpen={brainOpen} onClose={closeBrain} />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrandProvider>
        <SessionProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </SessionProvider>
      </BrandProvider>
    </ThemeProvider>
  )
}
