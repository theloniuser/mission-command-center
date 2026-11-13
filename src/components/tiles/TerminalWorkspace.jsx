import { useEffect } from 'react'
import { useTerminal } from '../../context/TerminalContext.jsx'
import { MAX_DOCKED, effectiveDocked, paneOrder } from '../../context/paneState.js'
import TerminalPane from './TerminalPane.jsx'
import PaneStatusBar from './PaneStatusBar.jsx'

const UNDOCKED_ORDER_BASE = 100

export default function TerminalWorkspace({ projects }) {
  const {
    panes, paneState, dockedIds, minimizedIds, getLaunchOverride,
    addTerminalPane, closeTerminalPane, dockRight, dockPane, undock, movePane, toggleMinimize, pruneToProjects,
  } = useTerminal()

  // An empty list means projects have not loaded yet, not that every project was removed
  const projectIdsKey = projects.map(p => p.id).join(',')
  useEffect(() => {
    if (projectIdsKey) pruneToProjects(projectIdsKey.split(','))
  }, [projectIdsKey])

  const byId = new Map(projects.map(p => [p.id, p]))
  const live = panes.filter(p => byId.has(p.projectId))
  if (live.length === 0) return null

  // Panes render in creation order and never reorder; dock position is CSS order only,
  // so docking never moves a DOM node and xterm is never remounted.
  const docked = effectiveDocked({ docked: dockedIds }, live.map(p => p.id))
  const span = docked.length > 0 ? 6 / docked.length : 6  // 6 columns: 1->6, 2->3, 3->2

  const labelFor = (pane) => {
    const siblings = live.filter(p => p.projectId === pane.projectId)
    const name = byId.get(pane.projectId).name
    return siblings.length > 1 ? `${name} #${siblings.indexOf(pane) + 1}` : name
  }
  const undockedPanes = live.filter(p => !docked.includes(p.id))
  // Reorder is CSS order only; undocked panes stack top to bottom in this order
  const rank = paneOrder(paneState)
  const undockedSorted = [...undockedPanes].sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id))

  return (
    <div className="terminal-workspace">
      {live.map(pane => {
        const project = byId.get(pane.projectId)
        const dockIdx = docked.indexOf(pane.id)
        const isDocked = dockIdx !== -1
        const minimized = minimizedIds.includes(pane.id)
        const dockCandidates = undockedPanes
          .filter(p => p.id !== pane.id)
          .map(p => ({ terminalId: p.id, label: labelFor(p) }))
        // With a dock already showing, an undocked pane joins it directly (no picker)
        const joinsDock = !isDocked && docked.length >= 2
        const roomLeft = joinsDock
          ? docked.length < MAX_DOCKED
          : docked.length + (isDocked ? 1 : 2) <= MAX_DOCKED
        const canDockRight = roomLeft && (joinsDock || dockCandidates.length > 0)
        const dockDisabledReason = !roomLeft
          ? `Dock is full (${MAX_DOCKED} max)`
          : 'No other running session to dock'
        const style = isDocked
          ? { order: dockIdx, '--dock-span': span }
          : { order: UNDOCKED_ORDER_BASE + rank.indexOf(pane.id) }
        const group = isDocked ? docked : undockedSorted.map(p => p.id)
        const groupIdx = group.indexOf(pane.id)

        return (
          <article
            key={pane.id}
            className={`terminal-pane-card${isDocked ? ' terminal-pane-card--docked' : ''}${minimized ? ' terminal-pane-minimized' : ''}`}
            style={style}
          >
            <div className="tile-color-bar" style={{ background: project.color }} />
            <TerminalPane
              projectPath={project.path}
              projectId={project.id}
              terminalId={pane.id}
              launchCommand={project.launch_command}
              pasteText={getLaunchOverride(pane.id)}
              accentColor={project.color}
            />
            <PaneStatusBar
              terminalId={pane.id}
              project={project}
              onAddPane={() => addTerminalPane(project.id)}
              onClose={async () => {
                try { await fetch(`/api/terminal/${encodeURIComponent(pane.id)}`, { method: 'DELETE' }) } catch {}
                closeTerminalPane(pane.id)
              }}
              isMinimized={minimized}
              onToggleMinimize={() => toggleMinimize(pane.id)}
              isDocked={isDocked}
              canDockRight={canDockRight}
              dockDisabledReason={dockDisabledReason}
              joinsDock={joinsDock}
              onJoinDock={() => dockPane(pane.id)}
              dockCandidates={dockCandidates}
              onDockRight={(pickedId) => dockRight(pane.id, pickedId)}
              onUndock={() => undock(pane.id)}
              axis={isDocked ? 'x' : 'y'}
              canMoveEarlier={groupIdx > 0}
              canMoveLater={groupIdx !== -1 && groupIdx < group.length - 1}
              onMove={dir => movePane(pane.id, dir)}
            />
          </article>
        )
      })}
    </div>
  )
}
