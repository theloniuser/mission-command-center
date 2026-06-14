import { createContext, useContext, useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const BrandContext = createContext({ brandMode: 'ADS', brandConfig: {}, applyBrand: () => {} })

function getLinkHref(config) {
  const mode = config?.theme_mode || 'ADS'
  if (mode === 'Generic') return '/generic-tokens.css'
  if (mode === 'Custom' && config?.token_css_path) {
    return `/api/brand-css?path=${encodeURIComponent(config.token_css_path)}`
  }
  return '/ads-tokens.css'
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
  const [brandConfig, setBrandConfig] = useState({ theme_mode: 'ADS', token_css_path: '', logo_path: '', primary_color: '' })

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        if (data.brand) {
          setBrandConfig(data.brand)
          swapTokenLink(getLinkHref(data.brand))
        }
      })
      .catch(() => {})
  }, [])

  function applyBrand(newConfig) {
    setBrandConfig(newConfig)
    swapTokenLink(getLinkHref(newConfig))
  }

  return (
    <BrandContext.Provider value={{ brandMode: brandConfig.theme_mode || 'ADS', brandConfig, applyBrand }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}
