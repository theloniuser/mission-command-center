import { createContext, useContext, useRef, useState } from 'react'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  const [activeTerminalIds, setActiveTerminalIds] = useState(new Set())
  const [activeChangelogId, setActiveChangelogId] = useState(null)
  const pendingCommandsRef = useRef({})
  const terminalWritersRef = useRef({})

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

  function sendCommand(id, command) {
    const writer = terminalWritersRef.current[id]
    if (writer) {
      writer(command + '\n')
    } else {
      openTerminal(id)
      pendingCommandsRef.current[id] = command
    }
  }

  function consumePendingCommand(id) {
    const cmd = pendingCommandsRef.current[id] ?? null
    delete pendingCommandsRef.current[id]
    return cmd
  }

  function registerTerminal(id, writeFn) {
    terminalWritersRef.current[id] = writeFn
  }

  function unregisterTerminal(id) {
    delete terminalWritersRef.current[id]
  }

  function openChangelog(id) {
    setActiveChangelogId(prev => (prev === id ? null : id))
  }

  return (
    <TerminalContext.Provider value={{
      activeTerminalIds, openTerminal, closeTerminal,
      sendCommand, consumePendingCommand, registerTerminal, unregisterTerminal,
      activeChangelogId, openChangelog,
    }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  return useContext(TerminalContext)
}
