# Milestone 2 — Live Session Monitoring

## What's new in the app

- **Live session tiles** — each configured project tile now shows real data from the active Claude Code session: token count, model name, and status badge (ACTIVE / IDLE / CLOSED)
- **Token gauge with live updates** — the progress bar fills in real time, turning orange past 80K tokens and staying orange past 120K; threshold markers are visible tick marks on the gauge track
- **MCP server badges** — each tile shows which MCP servers were detected in the session, with a blue dot for engaged (used in last 50 JSONL entries) and a gray dot for idle; hovering shows last-used time
- **Session spend estimate** — each tile shows a cost estimate (e.g. ~$8.30) calculated from token usage across the session using Anthropic's published pricing
- **Live summary bar** — the header bar now shows real counts: X sessions active, Y MCPs engaged, ~$Z today
- **Tiles sorted by recency** — active sessions appear first, then idle, then closed; within each group sorted by most recently active timestamp
- **10-second polling** — all data refreshes automatically without a page reload

---

## What was built

### New files
| File | Purpose |
|------|---------|
| `server/sessionScanner.js` | Reads `~/.claude/projects/` JSONL files; derives session status, token count, model, MCPs, spend |
| `src/context/SessionContext.jsx` | React context that polls `/api/sessions` every 10s; exposes `{ sessions, stats }` to Dashboard and Header |
| `src/components/tiles/McpBadge.jsx` | Single MCP badge: name + dot indicator + tooltip |

### Modified files
| File | Change |
|------|--------|
| `server/index.js` | Added `GET /api/sessions` route (calls `scanAllSessions`) |
| `src/App.jsx` | Wrapped app with `<SessionProvider>` |
| `src/pages/Dashboard.jsx` | Consumes `useSession()`; merges session data onto projects; sorts tiles by status + recency |
| `src/components/tiles/ProjectTile.jsx` | Added MCP badges row + spend line; fixed raw hex in `gaugeColor()` → CSS vars |
| `src/components/layout/Header.jsx` | Consumes `useSession()` directly for live summary bar counts |
| `src/styles/main.css` | Added `.tile-mcps`, `.mcp-badge`, `.mcp-engaged`, `.mcp-idle`, `.tile-spend`, `.status-active/idle/closed` |

### API route: `GET /api/sessions`
Returns `{ sessions: [...], summary: { sessions_active, mcps_engaged, spend_today } }`.

---

## Key decisions made during implementation

### Token count = total context size (not just new input)
Claude Code's JSONL usage field has `input_tokens: 1` for most turns because the real context is cached. The actual context size is `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`. The scanner uses this sum for the gauge, giving meaningful values (120K–160K range for typical sessions).

### Spend calculation uses cache-aware pricing
Cache reads are charged at ~10% of full input rate. Using full rate for all tokens inflated spend 10x. Final formula per turn: `newInp * $3/MTok + cacheW * $3.75/MTok + cacheR * $0.30/MTok + out * $15/MTok` (Sonnet rates).

### Path matching: `~` expansion required
Project paths are stored as `~/...` shorthand in `config/projects.json`. The scanner expands `~` via `os.homedir()` before converting to the `~/.claude/projects/` directory name format (replace all `/` with `-`, keep the leading `/` so it becomes a leading `-`).

### MCP "engaged" = last 50 JSONL lines
Only MCPs appearing in the last 50 assistant message content blocks are marked engaged (blue dot). This matches expected UX: a tool used earlier in the session but not recently shows as idle.

### MCP "configured" list — project-local only
The global `~/.claude/settings.json` has 30+ MCP servers. Showing all of them would flood every tile. Only MCPs from the project's own `.claude/settings.json` or `.mcp.json` are included (plus any observed in the session JSONL).

### ADS palette — no green for "engaged"
PRD says "green when engaged" but ADS palette has no green. Decision: use `var(--color-blue)` for engaged, gray dot for idle. Blue is the ADS active/action color — this is brand-correct. Documented here so Milestone 3 doesn't revert it.

### SessionContext over prop drilling
`Header` is rendered at App level (outside Dashboard), so stats couldn't be passed up easily. A `SessionContext` provider wraps both, exposing `{ sessions, stats }` — Header and Dashboard each consume it via `useSession()`. One poll, two consumers.

---

## Milestone 3 will need to know

### Session data structure
Each session object returned by `/api/sessions`:
```js
{
  projectId: "uuid",           // matches project.id from /api/projects
  status: "active"|"idle"|"closed",
  model: "Sonnet 4.6",
  agent_type: "Claude Code",
  token_count: 161271,         // total context: newInp + cacheR + cacheW
  started_at: "ISO timestamp", // first entry in JSONL
  last_active_at: "ISO timestamp", // file mtime
  spend_usd: 8.30,
  mcps: [{ name: "context-mode", engaged: true, last_used: "ISO" }]
}
```

### Polling approach
`SessionContext.jsx` runs `setInterval(fetchSessions, 10_000)` — a simple REST poll. M3 may want to add SSE or WebSocket if sub-10s alerting is needed for threshold crossing.

### Status thresholds
Active: file mtime < 5 min ago. Idle: 5–30 min. Closed: >30 min. Constants in `server/sessionScanner.js` as `ACTIVE_MS` and `IDLE_MS`.

### MCP detection method
MCP tool use is detected by scanning `entry.message.content` array for blocks with `type === 'tool_use'` and `name.startsWith('mcp__')`. The server segment is extracted as `name.split('__')[1]` and cleaned (strips `plugin_` prefix). M3 will use the same pattern to surface MCP-specific alerts.

### Token threshold constants
`THRESHOLD_80K = 80000`, `THRESHOLD_120K = 120000`, `THRESHOLD_150K = 150000` defined in `ProjectTile.jsx`. The Alert Config thresholds from settings (`compact_threshold`, `handoff_threshold`, `protocol_threshold`) are wired in M3.

---

## Deviations from PRD

- **MCP "engaged" dot color**: PRD says green; implemented as `var(--color-blue)` per ADS brand (no green in palette)
- **Codex monitoring**: confirmed not available in M2 — Claude Code JSONL is the only local session format available; Codex sessions have no equivalent local file
- **No "no-session" tile collapse**: tiles with status `closed` remain visible in the grid (sorted last); PRD was ambiguous on whether to hide them — kept visible for discoverability
