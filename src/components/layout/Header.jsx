import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { useBrand } from '../../context/BrandContext.jsx'

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
  const { brandMode, brandConfig, title } = useBrand()

  useEffect(() => { document.title = title }, [title])

  return (
    <header className={`site-header site-header--${brandMode.toLowerCase()}`}>
      {brandMode === 'ADS' && (
        <svg className="site-texture" aria-hidden="true"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 917.92 708.34">
          <path fill="none" stroke="currentColor" strokeWidth="1"
            d="M916.92,707.34h-118.7c0-43.75-1.4-86.43-4.07-127.6,28.29-19.99,46.76-52.97,46.76-90.26,0-46.85-29.15-86.88-70.31-102.93-33.34-177.91-93.59-296.72-162.36-296.72-104.92,0-189.98,276.48-189.98,617.51H1C1,317.22,206.04,1,458.94,1s457.98,316.22,457.98,706.34Z"/>
          <path fill="none" stroke="currentColor" strokeWidth="0.5"
            d="M770.6,386.55c41.16,16.05,70.31,56.08,70.31,102.93,0,37.29-18.47,70.27-46.76,90.26"/>
          <path fill="none" stroke="currentColor" strokeWidth="1"
            d="M794.15,579.74c-17.99,12.73-39.95,20.2-63.66,20.2-61,0-110.43-49.46-110.43-110.46s49.43-110.44,110.43-110.44c14.15,0,27.68,2.66,40.11,7.51"/>
        </svg>
      )}
      <div className="header-inner">
        <span className="site-logo">
          <Logo theme={theme} brandMode={brandMode} brandConfig={brandConfig} />
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
