# Changes — 2026-06-22 16:14

## Close confirmation + visual polish

**Two-click confirm before closing a pane** (`2725736`)
- First click on `✕` shows `close?` in orange; second click closes
- Auto-resets after 3s if not confirmed
- Same pattern as `/compact` — no browser alert, stays in-flow

**Chevron minimize button polish** (`274fb95`)
- `∧` / `∨` wrapped in `.tsb-chevron` span: `font-size: 1.1rem` + `scaleY(0.5)` matches `✕` stroke weight and gives a flatter shape
- Light/dark mode overrides aligned with close button

**ACTIVE badge color** (`274fb95`)
- Changed from blue to `--color-orange-ui` on both tile cards and expanded status bars

### Files modified
- `src/components/tiles/ProjectTile.jsx` — close confirm state + timer in `PaneStatusBar`, chevron span
- `src/styles/main.css` — `.tsb-chevron`, ACTIVE badge color, minimize button styles
