# Changes — 2026-06-22 16:11

## Multi-pane terminal sessions in Command Center

### What shipped

**Multi-pane sessions per project tile** (`b7b17f1`)
- Each project tile can now host multiple independent terminal panes
- `+session` button in any pane's status bar adds a new pane below it
- Each pane is a fully independent PTY/WebSocket connection — separate `claude` process
- Tile collapses only when the last pane is closed

**Per-pane autonomous status bars** (`ce2771c` → `b7b17f1` refactor)
- Removed the shared status bar; each pane owns its own
- `/compact`, `/handoff`, `+session`, minimize, and close are all per-pane
- `sendCommand` targets the specific pane's `terminalId` (first pane keeps `terminalId === projectId` for backward compat)

**Minimize/restore without killing the session** (`ce2771c`, `beb6047`)
- `∧` collapses pane to status bar only — PTY/WebSocket stays alive
- `∨` restores — session resumes exactly where it left off
- No black gap: removed `min-height: 420px` from `.project-tile--expanded`
- Minimize and close buttons grouped on the right via `margin-left: auto` on `.tsb-minimize`

**Visual polish** (`a268455`, `274fb95`)
- Chevrons use `tsb-chevron` span: `font-size: 1.1rem` + `scaleY(0.5)` — heavier stroke, squatter shape matching `✕`
- ACTIVE status badge changed from blue to `--color-orange-ui` on both tile cards and expanded status bars

### Files modified
- `src/components/tiles/ProjectTile.jsx` — `PaneStatusBar` component, minimize state, multi-pane render
- `src/components/tiles/TerminalPane.jsx` — `terminalId` prop (defaults to `projectId`) for registry keys
- `src/context/TerminalContext.jsx` — `Map<projectId, terminalId[]>` replacing `Set`, added `addTerminalPane`, `closeTerminalPane`, `getTerminalIds`
- `src/styles/main.css` — pane wrapper/header styles, minimize button, chevron, ACTIVE color

### Architecture note
First pane always gets `terminalId === projectId` so existing `/compact` and `/handoff` commands continue to work against the primary session without changes.
