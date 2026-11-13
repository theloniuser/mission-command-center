import assert from 'node:assert'
import {
  MAX_DOCKED, initialPaneState, projectIdOf, paneIdsFor, ensurePane, toggleProject,
  closePane, closeProject, dockRight, undock, toggleMinimize, effectiveDocked, prunePanes, dockPane,
  movePane, paneOrder,
} from './paneState.js'

const ids = (s) => s.panes.map(p => p.id)
function withPanes(...paneIds) {
  return paneIds.reduce((s, id) => ensurePane(s, id), initialPaneState)
}

assert.strictEqual(MAX_DOCKED, 3)
assert.strictEqual(projectIdOf('p1'), 'p1')
assert.strictEqual(projectIdOf('p1::abc'), 'p1')

// ensurePane: idempotent, keeps creation order, derives project from id
let s = ensurePane(initialPaneState, 'p1')
assert.strictEqual(ensurePane(s, 'p1'), s)
s = ensurePane(s, 'p2')
s = ensurePane(s, 'p1::x')
assert.deepStrictEqual(ids(s), ['p1', 'p2', 'p1::x'])
assert.deepStrictEqual(paneIdsFor(s, 'p1'), ['p1', 'p1::x'])

// Review Focus 3: ensuring the bare pane when only suffixed panes exist must not close anything
const onlySuffixed = withPanes('p1::x')
const ensured = ensurePane(onlySuffixed, 'p1')
assert.deepStrictEqual(ids(ensured), ['p1::x', 'p1'])

// toggleProject: opens bare pane, second call closes all of that project's panes
s = toggleProject(initialPaneState, 'p1')
assert.deepStrictEqual(ids(s), ['p1'])
s = ensurePane(s, 'p1::x')
assert.deepStrictEqual(ids(toggleProject(s, 'p1')), [])

// dockRight: neither pane docked -> both dock, picked immediately right of anchor
s = withPanes('a', 'b', 'c')
let d = dockRight(s, 'a', 'c')
assert.deepStrictEqual(d.docked, ['a', 'c'])

// anchor already docked -> picked inserted right after it
d = dockRight(d, 'a', 'b')
assert.deepStrictEqual(d.docked, ['a', 'b', 'c'])

// cap: a fourth pane cannot dock
s = withPanes('a', 'b', 'c', 'd')
d = dockRight(dockRight(s, 'a', 'b'), 'b', 'c')
assert.deepStrictEqual(d.docked, ['a', 'b', 'c'])
assert.strictEqual(dockRight(d, 'c', 'd'), d)

// an undocked anchor needs room for two panes; with two already docked it is rejected
s = withPanes('a', 'b', 'c', 'd')
d = dockRight(s, 'a', 'b')
assert.strictEqual(dockRight(d, 'c', 'd'), d)
assert.strictEqual(d.docked.length, 2)

// rejects: self, unknown ids, picked already docked
s = withPanes('a', 'b')
assert.strictEqual(dockRight(s, 'a', 'a'), s)
assert.strictEqual(dockRight(s, 'a', 'zzz'), s)
assert.strictEqual(dockRight(s, 'zzz', 'a'), s)
d = dockRight(s, 'a', 'b')
assert.strictEqual(dockRight(d, 'a', 'b'), d)

// Review Focus 4: docking restores minimized panes; docked panes cannot minimize
s = toggleMinimize(withPanes('a', 'b'), 'a')
assert.deepStrictEqual(s.minimized, ['a'])
d = dockRight(s, 'a', 'b')
assert.deepStrictEqual(d.minimized, [])
assert.strictEqual(toggleMinimize(d, 'a'), d)
assert.deepStrictEqual(toggleMinimize(toggleMinimize(withPanes('a'), 'a'), 'a').minimized, [])

// undock: removes one; a lone remaining docked pane collapses the dock
s = withPanes('a', 'b', 'c')
d = dockRight(dockRight(s, 'a', 'b'), 'b', 'c')
assert.deepStrictEqual(undock(d, 'b').docked, ['a', 'c'])
assert.deepStrictEqual(undock(undock(d, 'b'), 'a').docked, [])
assert.strictEqual(undock(s, 'a'), s)

// Review Focus 1: closing a docked pane removes it and collapses a lone survivor
d = dockRight(withPanes('a', 'b'), 'a', 'b')
let closed = closePane(d, 'a')
assert.deepStrictEqual(ids(closed), ['b'])
assert.deepStrictEqual(closed.docked, [])
assert.strictEqual(closePane(d, 'nope'), d)

// closeProject removes all of the project's panes from panes, docked and minimized
s = withPanes('p1', 'p1::x', 'p2')
d = dockRight(s, 'p1', 'p2')
closed = closeProject(d, 'p1')
assert.deepStrictEqual(ids(closed), ['p2'])
assert.deepStrictEqual(closed.docked, [])
assert.strictEqual(closeProject(s, 'nope'), s)

// Review Focus 2: only live docked panes count; fewer than 2 live means no dock
d = dockRight(withPanes('a', 'b', 'c'), 'a', 'b')
assert.deepStrictEqual(effectiveDocked(d, ['a', 'b', 'c']), ['a', 'b'])
assert.deepStrictEqual(effectiveDocked(d, ['a', 'c']), [])

// Review finding: panes of removed projects must be pruned so stale ids cannot eat dock capacity
s = withPanes('a', 'b', 'c', 'd')
d = dockRight(dockRight(s, 'a', 'b'), 'b', 'c')
assert.strictEqual(prunePanes(d, ['a', 'b', 'c', 'd']), d)
let pruned = prunePanes(d, ['a', 'b', 'd'])
assert.deepStrictEqual(ids(pruned), ['a', 'b', 'd'])
assert.deepStrictEqual(pruned.docked, ['a', 'b'])
// with C gone there is room for one more: docking D next to A now succeeds
assert.deepStrictEqual(dockRight(pruned, 'a', 'd').docked, ['a', 'd', 'b'])
// removing one of two docked leaves no dock, so an unrelated pair can dock
d = dockRight(s, 'a', 'b')
pruned = prunePanes(d, ['a', 'c', 'd'])
assert.deepStrictEqual(pruned.docked, [])
assert.deepStrictEqual(dockRight(pruned, 'c', 'd').docked, ['c', 'd'])
// suffixed panes are kept when their project is live, dropped with the project
s = withPanes('p1', 'p1::x', 'p2')
assert.deepStrictEqual(ids(prunePanes(s, ['p1'])), ['p1', 'p1::x'])

// User-reported: with two panes docked, an undocked third pane must be able to join the dock
s = withPanes('a', 'b', 'c', 'd')
d = dockRight(s, 'a', 'b')
let joined = dockPane(d, 'c')
assert.deepStrictEqual(joined.docked, ['a', 'b', 'c'])
assert.deepStrictEqual(dockPane(toggleMinimize(d, 'c'), 'c').minimized, [])
assert.strictEqual(dockPane(joined, 'd'), joined)       // dock full
assert.strictEqual(dockPane(s, 'c'), s)                 // no dock yet: use dockRight instead
assert.strictEqual(dockPane(d, 'a'), d)                 // already docked
assert.strictEqual(dockPane(d, 'zzz'), d)               // unknown pane

// movePane: undocked panes swap with their undocked neighbor, order only (panes array untouched)
s = withPanes('a', 'b', 'c')
let m = movePane(s, 'a', 1)
assert.deepStrictEqual(paneOrder(m), ['b', 'a', 'c'])
assert.deepStrictEqual(ids(m), ['a', 'b', 'c'])
assert.strictEqual(movePane(s, 'a', -1), s)              // first can't go earlier
assert.strictEqual(movePane(s, 'c', 1), s)               // last can't go later
assert.strictEqual(movePane(s, 'zzz', 1), s)             // unknown pane

// movePane: docked panes reorder within the dock, undocked ones skip over docked panes
s = withPanes('a', 'b', 'c', 'd')
d = dockRight(s, 'b', 'd')                               // docked: b, d
assert.deepStrictEqual(movePane(d, 'b', 1).docked, ['d', 'b'])
assert.strictEqual(movePane(d, 'b', -1), d)
assert.deepStrictEqual(movePane(d, 'd', -1).docked, ['d', 'b'])   // right pane moves left
assert.deepStrictEqual(movePane(movePane(d, 'd', -1), 'd', 1).docked, ['b', 'd'])
const d3 = dockPane(d, 'a')                                       // docked: b, d, a
assert.deepStrictEqual(d3.docked, ['b', 'd', 'a'])
assert.deepStrictEqual(movePane(d3, 'a', -1).docked, ['b', 'a', 'd'])
assert.deepStrictEqual(movePane(d3, 'd', -1).docked, ['d', 'b', 'a'])
m = movePane(d, 'a', 1)                                 // undocked a, c -> c, a
assert.deepStrictEqual(paneOrder(m).filter(i => !d.docked.includes(i)), ['c', 'a'])

// order survives closing an unrelated pane and ignores stale ids
m = closePane(movePane(withPanes('a', 'b', 'c'), 'a', 1), 'c')
assert.deepStrictEqual(paneOrder(m), ['b', 'a'])

console.log('paneState.verify.js: all assertions passed')
