export const MAX_DOCKED = 3

// panes: [{ id, projectId }] in creation order (also the stable DOM order)
// docked: ordered terminalIds shown side by side; minimized: terminalIds
// order: user-chosen display order of all panes (CSS order only; may hold stale or missing ids)
export const initialPaneState = { panes: [], docked: [], minimized: [], order: [] }

export function projectIdOf(terminalId) {
  return terminalId.includes('::') ? terminalId.split('::')[0] : terminalId
}

function hasPane(state, id) {
  return state.panes.some(p => p.id === id)
}

// One docked pane is just a full-width pane, so a dock only exists at 2 or more
function normalizeDocked(docked) {
  return docked.length < 2 ? [] : docked
}

export function paneIdsFor(state, projectId) {
  return state.panes.filter(p => p.projectId === projectId).map(p => p.id)
}

export function ensurePane(state, id) {
  if (hasPane(state, id)) return state
  return { ...state, panes: [...state.panes, { id, projectId: projectIdOf(id) }] }
}

export function toggleProject(state, projectId) {
  if (paneIdsFor(state, projectId).length > 0) return closeProject(state, projectId)
  return ensurePane(state, projectId)
}

export function closePane(state, id) {
  if (!hasPane(state, id)) return state
  return {
    panes: state.panes.filter(p => p.id !== id),
    docked: normalizeDocked(state.docked.filter(d => d !== id)),
    minimized: state.minimized.filter(m => m !== id),
    order: state.order,
  }
}

export function closeProject(state, projectId) {
  const gone = new Set(paneIdsFor(state, projectId))
  if (gone.size === 0) return state
  return {
    panes: state.panes.filter(p => !gone.has(p.id)),
    docked: normalizeDocked(state.docked.filter(d => !gone.has(d))),
    minimized: state.minimized.filter(m => !gone.has(m)),
    order: state.order,
  }
}

export function dockRight(state, anchorId, pickedId) {
  if (anchorId === pickedId) return state
  if (!hasPane(state, anchorId) || !hasPane(state, pickedId)) return state
  if (state.docked.includes(pickedId)) return state
  const anchorDocked = state.docked.includes(anchorId)
  if (state.docked.length + (anchorDocked ? 1 : 2) > MAX_DOCKED) return state
  const docked = [...state.docked]
  if (!anchorDocked) docked.push(anchorId)
  docked.splice(docked.indexOf(anchorId) + 1, 0, pickedId)
  return {
    ...state,
    docked,
    minimized: state.minimized.filter(m => m !== anchorId && m !== pickedId),
  }
}

// Add one undocked pane to the end of an existing dock (needs 2+ docked and a free slot);
// dockRight cannot do this because an undocked anchor needs room for itself and the pick
export function dockPane(state, id) {
  if (!hasPane(state, id) || state.docked.includes(id)) return state
  if (state.docked.length < 2 || state.docked.length >= MAX_DOCKED) return state
  return {
    ...state,
    docked: [...state.docked, id],
    minimized: state.minimized.filter(m => m !== id),
  }
}

export function undock(state, id) {
  if (!state.docked.includes(id)) return state
  return { ...state, docked: normalizeDocked(state.docked.filter(d => d !== id)) }
}

export function toggleMinimize(state, id) {
  if (!hasPane(state, id) || state.docked.includes(id)) return state
  const minimized = state.minimized.includes(id)
    ? state.minimized.filter(m => m !== id)
    : [...state.minimized, id]
  return { ...state, minimized }
}

// Drop panes whose project left the config, so stale ids cannot hold dock capacity or
// reappear docked if the project id is ever re-added. Same reference when nothing is dead.
export function prunePanes(state, liveProjectIds) {
  const live = new Set(liveProjectIds)
  const dead = state.panes.filter(p => !live.has(p.projectId)).map(p => p.id)
  if (dead.length === 0) return state
  const gone = new Set(dead)
  return {
    panes: state.panes.filter(p => !gone.has(p.id)),
    docked: normalizeDocked(state.docked.filter(d => !gone.has(d))),
    minimized: state.minimized.filter(m => !gone.has(m)),
    order: state.order,
  }
}

// Docked ids whose pane is actually rendered (a project removed from config
// leaves a stale id behind); under 2 live means no dock at all.
export function effectiveDocked(state, liveIds) {
  const live = new Set(liveIds)
  return normalizeDocked(state.docked.filter(d => live.has(d)))
}

// Display order of every pane: saved order first, panes never reordered yet in creation order
export function paneOrder(state) {
  const known = (state.order ?? []).filter(id => hasPane(state, id))
  return [...known, ...state.panes.map(p => p.id).filter(id => !known.includes(id))]
}

// Move a pane one step (dir -1 or 1) within its own group: the dock row when docked,
// otherwise among the undocked panes. Only CSS order changes, so no pane remounts.
export function movePane(state, id, dir) {
  if (!hasPane(state, id)) return state
  if (state.docked.includes(id)) {
    const from = state.docked.indexOf(id)
    const to = from + dir
    if (to < 0 || to >= state.docked.length) return state
    const docked = [...state.docked]
    ;[docked[to], docked[from]] = [docked[from], docked[to]]
    return { ...state, docked }
  }
  const undocked = paneOrder(state).filter(i => !state.docked.includes(i))
  const target = undocked[undocked.indexOf(id) + dir]
  if (target === undefined) return state
  const order = paneOrder(state)
  const a = order.indexOf(id), b = order.indexOf(target)
  ;[order[a], order[b]] = [order[b], order[a]]
  return { ...state, order }
}
