import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { useBrand } from '../../context/BrandContext.jsx'

function Logo({ brandMode, brandConfig }) {
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
  const { brandMode, brandConfig, title } = useBrand()

  useEffect(() => { document.title = title }, [title])

  return (
    <header className={`site-header site-header--${brandMode.toLowerCase()}`}>
      <div className="header-inner">
        <span className="site-logo">
          <Logo brandMode={brandMode} brandConfig={brandConfig} />
          <span className="site-title">{title}</span>
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
        </div>
      </div>
    </header>
  )
}
