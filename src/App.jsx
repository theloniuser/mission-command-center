import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { BrandProvider } from './context/BrandContext.jsx'
import { SessionProvider, useSession } from './context/SessionContext.jsx'
import { TerminalProvider } from './context/TerminalContext.jsx'
import Header from './components/layout/Header.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import LauncherModal from './components/modals/LauncherModal.jsx'

function AppLayout() {
  const { launcherOpen, launcherContext, closeLauncher } = useSession()
  const location = useLocation()
  const isSettings = location.pathname.startsWith('/settings')

  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <>
      <Header />
      {/* Keep Dashboard mounted so terminal WebSockets survive navigation */}
      <div style={{ display: isSettings ? 'none' : undefined }}>
        <Dashboard />
      </div>
      {isSettings && <Settings />}
      <LauncherModal isOpen={launcherOpen} initialContext={launcherContext} onClose={closeLauncher} />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrandProvider>
        <SessionProvider>
          <TerminalProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AppLayout />
            </BrowserRouter>
          </TerminalProvider>
        </SessionProvider>
      </BrandProvider>
    </ThemeProvider>
  )
}
