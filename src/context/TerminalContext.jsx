import { createContext, useContext, useRef, useState } from 'react'
import {
  initialPaneState, paneIdsFor, ensurePane, toggleProject, closePane, closeProject,
  dockRight as dockRightState, undock as undockState, toggleMinimize as toggleMinimizeState,
  prunePanes, dockPane as dockPaneState, movePane as movePaneState,
} from './paneState.js'

const TerminalContext = createContext(null)

export function TerminalProvider({ children }) {
  // Pane/dock state lives in paneState.js (pure, unit-verified); first terminalId of a project
  // is the bare projectId for compat, extra panes are projectId::<suffix>
  const [paneState, setPaneState] = useState(initialPaneState)
  const [activeChangelogId, setActiveChangelogId] = useState(null)
  const pendingCommandsRef  = useRef({})
  const terminalWritersRef  = useRef({})
  const terminalFocusRef    = useRef({})
  const terminalReadersRef  = useRef({})
  const terminalLineCountRef = useRef({})
  const paneCounterRef      = useRef({})
  const launchOverridesRef  = useRef({})

  function getTerminalIds(projectId) {
    return paneIdsFor(paneState, projectId)
  }

  function openTerminal(projectId) {
    setPaneState(prev => toggleProject(prev, projectId))
  }

  function addTerminalPane(projectId) {
    const existing = paneIdsFor(paneState, projectId)
    if (existing.length === 0) {
      setPaneState(prev => ensurePane(prev, projectId))
      return projectId
    }
    const count = (paneCounterRef.current[projectId] ?? 0) + 1
    paneCounterRef.current[projectId] = count
    const newId = `${projectId}::${count}`
    setPaneState(prev => ensurePane(prev, newId))
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
    setPaneState(prev => ensurePane(prev, newId))
    return newId
  }

  function closeTerminalPane(terminalId) {
    setPaneState(prev => closePane(prev, terminalId))
    delete terminalWritersRef.current[terminalId]
    delete terminalFocusRef.current[terminalId]
    delete terminalReadersRef.current[terminalId]
    delete terminalLineCountRef.current[terminalId]
    delete launchOverridesRef.current[terminalId]
  }

  function closeTerminal(projectId) {
    setPaneState(prev => closeProject(prev, projectId))
  }

  function pruneToProjects(liveProjectIds) {
    setPaneState(prev => prunePanes(prev, liveProjectIds))
  }

  function focusTerminal(id) {
    terminalFocusRef.current[id]?.()
  }

  function dockRight(anchorId, pickedId) {
    setPaneState(prev => dockRightState(prev, anchorId, pickedId))
    setTimeout(() => focusTerminal(pickedId), 50)
  }

  function dockPane(id) {
    setPaneState(prev => dockPaneState(prev, id))
    setTimeout(() => focusTerminal(id), 50)
  }

  function undock(id) {
    setPaneState(prev => undockState(prev, id))
  }

  function movePane(id, dir) {
    setPaneState(prev => movePaneState(prev, id, dir))
  }

  function toggleMinimize(id) {
    setPaneState(prev => toggleMinimizeState(prev, id))
  }

  function sendCommand(id, command) {
    const writer = terminalWritersRef.current[id]
    if (writer) {
      writer(command + '\r')
    } else {
      // ensurePane, not openTerminal: openTerminal toggles by project key, which closes
      // every pane when the project already has some and mis-keys suffixed ids
      setPaneState(prev => ensurePane(prev, id))
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
      panes: paneState.panes,
      dockedIds: paneState.docked,
      minimizedIds: paneState.minimized,
      paneState,
      getTerminalIds,
      openTerminal, addTerminalPane, openNewPane, closeTerminalPane, closeTerminal,
      dockRight, dockPane, undock, movePane, toggleMinimize, focusTerminal, pruneToProjects,
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
