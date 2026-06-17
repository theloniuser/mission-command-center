import { createContext, useContext, useRef, useState } from 'react'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  const [activeTerminalIds, setActiveTerminalIds] = useState(new Set())
  const [activeChangelogId, setActiveChangelogId] = useState(null)
  const pendingCommandsRef  = useRef({})
  const terminalWritersRef  = useRef({})
  const terminalFocusRef    = useRef({})
  const terminalReadersRef  = useRef({})

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
      writer(command + '\r')
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

  function registerTerminalFocus(id, focusFn) {
    terminalFocusRef.current[id] = focusFn
  }

  function unregisterTerminalFocus(id) {
    delete terminalFocusRef.current[id]
  }

  function registerTerminalReader(id, readFn) {
    terminalReadersRef.current[id] = readFn
  }

  function unregisterTerminalReader(id) {
    delete terminalReadersRef.current[id]
  }

  function getTerminalContent(id) {
    return terminalReadersRef.current[id]?.() ?? ''
  }

  function openChangelog(id) {
    setActiveChangelogId(prev => (prev === id ? null : id))
  }

  return (
    <TerminalContext.Provider value={{
      activeTerminalIds, openTerminal, closeTerminal,
      sendCommand, consumePendingCommand, registerTerminal, unregisterTerminal,
      registerTerminalFocus, unregisterTerminalFocus,
      registerTerminalReader, unregisterTerminalReader, getTerminalContent,
      activeChangelogId, openChangelog,
    }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  return useContext(TerminalContext)
}
