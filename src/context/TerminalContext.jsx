import { createContext, useContext, useState } from 'react'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  const [activeTerminalIds, setActiveTerminalIds] = useState(new Set())

  function openTerminal(id) {
    setActiveTerminalIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function closeTerminal(id) {
    setActiveTerminalIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <TerminalContext.Provider value={{ activeTerminalIds, openTerminal, closeTerminal }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  return useContext(TerminalContext)
}
