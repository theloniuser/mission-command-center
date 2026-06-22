import { createContext, useContext, useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const DEFAULT_TITLE = 'ADS Command Center'

const BrandContext = createContext({ brandMode: 'Generic', brandConfig: {}, title: DEFAULT_TITLE, applyBrand: () => {}, applyTitle: () => {} })

function getLinkHref(config) {
  const base = import.meta.env.BASE_URL || '/'
  const mode = config?.theme_mode || 'Generic'
  if (mode === 'Generic') return `${base}generic-tokens.css`
  if (mode === 'Custom' && config?.token_css_path) {
    return `/api/brand-css?path=${encodeURIComponent(config.token_css_path)}`
  }
  return `${base}ads-tokens.css`
}

function swapTokenLink(href) {
  let link = document.getElementById('brand-tokens')
  if (!link) {
    link = document.createElement('link')
    link.id = 'brand-tokens'
    link.rel = 'stylesheet'
    document.head.prepend(link)
  }
  if (link.href !== href && !link.href.endsWith(href)) {
    link.href = href
  }
}

export function BrandProvider({ children }) {
  const [brandConfig, setBrandConfig] = useState({ theme_mode: 'Generic', token_css_path: '', logo_path: '', primary_color: '' })
  const [title, setTitle] = useState(DEFAULT_TITLE)

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        if (data.brand) {
          setBrandConfig(data.brand)
          swapTokenLink(getLinkHref(data.brand))
        }
        if (data.title?.trim()) setTitle(data.title.trim())
      })
      .catch(() => {})
  }, [])

  function applyBrand(newConfig) {
    setBrandConfig(newConfig)
    swapTokenLink(getLinkHref(newConfig))
  }

  function applyTitle(newTitle) {
    setTitle(newTitle?.trim() || DEFAULT_TITLE)
  }

  return (
    <BrandContext.Provider value={{ brandMode: brandConfig.theme_mode || 'Generic', brandConfig, title, applyBrand, applyTitle }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}
