import { createContext, useContext, useState } from 'react'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  const [activeTerminalId, setActiveTerminalId] = useState(null)

  function openTerminal(id) {
    setActiveTerminalId(prev => (prev === id ? null : id))
  }

  function closeTerminal() {
    setActiveTerminalId(null)
  }

  return (
    <TerminalContext.Provider value={{ activeTerminalId, openTerminal, closeTerminal }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  return useContext(TerminalContext)
}
