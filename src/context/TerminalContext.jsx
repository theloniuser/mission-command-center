import { createContext, useContext, useRef, useState } from 'react'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  // Map<projectId, terminalId[]> — first terminalId always === projectId for compat
  const [projectTerminals, setProjectTerminals] = useState(new Map())
  const [activeChangelogId, setActiveChangelogId] = useState(null)
  const pendingCommandsRef  = useRef({})
  const terminalWritersRef  = useRef({})
  const terminalFocusRef    = useRef({})
  const terminalReadersRef  = useRef({})
  const terminalLineCountRef = useRef({})
  const paneCounterRef      = useRef({})
  const launchOverridesRef  = useRef({})

  function getTerminalIds(projectId) {
    return projectTerminals.get(projectId) ?? []
  }

  function openTerminal(projectId) {
    setProjectTerminals(prev => {
      const existing = prev.get(projectId) ?? []
      const next = new Map(prev)
      if (existing.length > 0) {
        next.delete(projectId)
      } else {
        next.set(projectId, [projectId])
      }
      return next
    })
  }

  function addTerminalPane(projectId) {
    const existing = projectTerminals.get(projectId) ?? []
    if (existing.length === 0) {
      setProjectTerminals(prev => {
        const next = new Map(prev)
        next.set(projectId, [projectId])
        return next
      })
      return projectId
    }
    const count = (paneCounterRef.current[projectId] ?? 0) + 1
    paneCounterRef.current[projectId] = count
    const newId = `${projectId}::${count}`
    setProjectTerminals(prev => {
      const next = new Map(prev)
      next.set(projectId, [...(prev.get(projectId) ?? []), newId])
      return next
    })
    return newId
  }

  // Always allocates a brand-new suffixed terminalId, never the bare
  // projectId slot — used when a command must reach a freshly spawned PTY.
  // The suffix must be collision-free against whatever the server already
  // has, not just a locally-incrementing counter: sessions persist across
  // reloads/restarts, so a fresh client's counter can restart at ::1 and
  // land on a suffix the server already holds a live PTY under, silently
  // reconnecting to it instead of spawning — dropping the launch command
  // exactly like the bare-projectId case this function exists to avoid.
  function openNewPane(projectId) {
    const newId = `${projectId}::${crypto.randomUUID()}`
    setProjectTerminals(prev => {
      const next = new Map(prev)
      next.set(projectId, [...(prev.get(projectId) ?? []), newId])
      return next
    })
    return newId
  }

  function closeTerminalPane(terminalId) {
    const projectId = terminalId.includes('::') ? terminalId.split('::')[0] : terminalId
    setProjectTerminals(prev => {
      const existing = prev.get(projectId) ?? []
      const filtered = existing.filter(id => id !== terminalId)
      const next = new Map(prev)
      if (filtered.length === 0) next.delete(projectId)
      else next.set(projectId, filtered)
      return next
    })
    delete terminalWritersRef.current[terminalId]
    delete terminalFocusRef.current[terminalId]
    delete terminalReadersRef.current[terminalId]
    delete terminalLineCountRef.current[terminalId]
    delete launchOverridesRef.current[terminalId]
  }

  function closeTerminal(projectId) {
    setProjectTerminals(prev => {
      const next = new Map(prev)
      next.delete(projectId)
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

  function setLaunchOverride(id, command) {
    launchOverridesRef.current[id] = command
  }

  function getLaunchOverride(id) {
    return launchOverridesRef.current[id] ?? null
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

  function registerTerminalLineCount(id, countFn) {
    terminalLineCountRef.current[id] = countFn
  }

  function unregisterTerminalLineCount(id) {
    delete terminalLineCountRef.current[id]
  }

  function getTerminalContent(id, fromLine = 0) {
    return terminalReadersRef.current[id]?.(fromLine) ?? ''
  }

  function getTerminalLineCount(id) {
    return terminalLineCountRef.current[id]?.() ?? 0
  }

  function openChangelog(id) {
    setActiveChangelogId(prev => (prev === id ? null : id))
  }

  return (
    <TerminalContext.Provider value={{
      projectTerminals, getTerminalIds,
      openTerminal, addTerminalPane, openNewPane, closeTerminalPane, closeTerminal,
      sendCommand, consumePendingCommand,
      setLaunchOverride, getLaunchOverride,
      registerTerminal, unregisterTerminal,
      registerTerminalFocus, unregisterTerminalFocus,
      registerTerminalReader, unregisterTerminalReader,
      registerTerminalLineCount, unregisterTerminalLineCount,
      getTerminalContent, getTerminalLineCount,
      activeChangelogId, openChangelog,
    }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  return useContext(TerminalContext)
}
