import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { BrandProvider } from './context/BrandContext.jsx'
import { SessionProvider, useSession } from './context/SessionContext.jsx'
import { TerminalProvider } from './context/TerminalContext.jsx'
import Header from './components/layout/Header.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import LauncherModal from './components/modals/LauncherModal.jsx'
function AppLayout() {
  const { launcherOpen, launcherBead, closeLauncher } = useSession()

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <LauncherModal isOpen={launcherOpen} initialBead={launcherBead} onClose={closeLauncher} />
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
