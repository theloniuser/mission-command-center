# ADS Command Center — Milestone 2: Live Session Monitoring
**2026-06-11 ~20:00**

## What shipped

Milestone 2 of the ADS Command Center is complete. The static tile grid now reads live data from Claude Code's local JSONL session files.

### New files
- `server/sessionScanner.js` — reads `~/.claude/projects/` JSONL files; returns session status, token count, model, spend, MCP list per project
- `src/context/SessionContext.jsx` — polls `/api/sessions` every 10s; exposes `{ sessions, stats }` via React context to Dashboard and Header
- `src/components/tiles/McpBadge.jsx` — MCP name + engaged/idle dot + last-used tooltip

### Modified files
- `server/index.js:~45` — added `GET /api/sessions` route
- `src/App.jsx` — wrapped app in `<SessionProvider>`
- `src/pages/Dashboard.jsx` — consumes `useSession()`; merges session data onto project tiles; sorts by status+recency
- `src/components/tiles/ProjectTile.jsx` — added MCP badges row, spend line, status badge color variants; fixed raw hex → CSS vars in gaugeColor()
- `src/components/layout/Header.jsx` — summary bar now shows live counts from `useSession()`
- `src/styles/main.css` — added `.tile-mcps`, `.mcp-badge`, `.mcp-engaged`, `.mcp-idle`, `.tile-spend`, `.status-active/idle/closed` styles
- `config/projects.json` — added ads-command-center project tile

## Key decisions

- **token_count = newInp + cacheR + cacheW** — `input_tokens` alone is 1 for most turns (cached); must sum all three fields for real context size
- **Spend uses cache-aware pricing** — cacheRead at $0.30/MTok (not $3/MTok); without this, spend was inflated ~10x
- **Path matching requires tilde expansion** — `~/...` paths in config.json need `os.homedir()` expansion before slashing to dir names
- **Engaged dot = `var(--color-blue)`** — ADS palette has no green; blue is the ADS active/action color; documented deviation from PRD
- **MCP list = project-local only** — global `~/.claude/settings.json` has 30+ servers; showing all would flood tiles; only `.claude/settings.json` or `.mcp.json` in project dir included

## Bugs fixed during implementation

- `pathToDirName` was stripping leading `/` before replacing; leading `-` was missing in directory name → sessions not found
- `token_count: 1` on all tiles — was reading only `input_tokens`; switched to sum of all three fields
- Duplicate `const usage` declaration introduced by edit — removed
- Spend inflated 10x — added separate `cacheWrite` and `cacheRead` rates to PRICING table
- Brand audit: `border-radius: 10px` on `.mcp-badge` (pill) → `var(--radius-md)` (4px)
- Brand audit: em dash in McpBadge tooltip (`${name} — last used`) → replaced with colon

## Verified in browser

- ads-command-center tile: ACTIVE / 161K tokens / Sonnet 4.6 / context-mode + claude-in-chrome badges / ~$8.30
- ADS-skills tile: IDLE
- Summary bar: live counts update
- 10s polling confirmed: token count incremented between screenshots without page reload

## Next session

Start Milestone 3: Alert System. Key context in `milestone-log.md` under "Milestone 3 will need to know" — session data shape, polling approach, status thresholds, MCP detection method, token threshold constants.
