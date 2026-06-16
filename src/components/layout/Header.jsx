import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { useBrand } from '../../context/BrandContext.jsx'
import BrainCapture from '../sidebar/BrainCapture.jsx'

function Logo({ theme, brandMode, brandConfig }) {
  if (brandMode === 'ADS') {
    return (
      <img
        id="siteLogo"
        src={theme === 'dark' ? `${import.meta.env.BASE_URL}ADS-logo-primary-orange-white-text.svg` : `${import.meta.env.BASE_URL}ADS-logo-primary.svg`}
        alt="Arc Design Studio"
      />
    )
  }
  if (brandMode === 'Custom' && brandConfig.logo_path) {
    return (
      <img
        id="siteLogo"
        src={`/api/brand-asset?path=${encodeURIComponent(brandConfig.logo_path)}`}
        alt="Command Center"
      />
    )
  }
  return null
}

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { stats } = useSession()
  const { brandMode, brandConfig } = useBrand()

  return (
    <header className="site-header">
      <div className="header-inner">
        <span className="site-logo">
          <Logo theme={theme} brandMode={brandMode} brandConfig={brandConfig} />
          <span className="site-title">Command Center</span>
        </span>

        <div className="header-right">
          <nav className="header-nav">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>

          <button
            className="theme-toggle"
            id="themeToggle"
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀︎' : '☾︎'}
          </button>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-bar-inner">
          <span className="summary-stat">
            <strong>{stats?.sessions_active ?? '—'}</strong> sessions active
          </span>
          <span className="summary-divider" />
          <span className="summary-stat">
            <strong>{stats?.mcps_engaged ?? '—'}</strong> MCPs engaged
          </span>
          <span className="summary-divider" />
          <span className="summary-stat">
            <strong>${stats?.spend_today ?? '—'}</strong> today
          </span>
        </div>
        <BrainCapture inline />
      </div>
    </header>
  )
}
