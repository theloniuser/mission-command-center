# Milestone 3 — Alerts, Actions & Backlog

## What's new in the app

- **Token threshold toasts** — When a session crosses 80K, 120K, or 150K tokens, a toast fires top-right with the project name, token count, and a one-click copy button for the suggested command (`/compact`, `/handoff`, or `/clear`)
- **Inactivity alerts** — If a session goes inactive beyond the configured timeout (default 30 min), a toast fires automatically
- **Per-project alert sounds** — Each project tile has a sound toggle (on/off) and a 5-option synthesizer selector (Chime, Ping, Blip, 2-Tone, Pulse). Sound plays on first alert for that project. Preferences saved per project in localStorage
- **Live backlog sidebar** — The sidebar now shows open beads from `bd list`, grouped by project prefix, with priority badges. Refreshes every 30 seconds
- **Launch Session modal** — Each bead has a Launch button that opens a modal with project, agent type, and model selectors. Clicking Launch opens a new iTerm2 window in the project path (falls back to macOS Terminal if iTerm2 isn't running)
- **Brain capture button** — Persistent "Brain" button in the dashboard header opens a textarea modal. Text is sent to the configured Brain API endpoint via the Express proxy (key never hits the browser)

---

## What was built

### Server additions (`server/index.js`)

**`GET /api/beads`** — shells out to `bd list`, parses output with a regex, groups items by project prefix (e.g. all `ADS-skills-*` under "ADS-skills"), sorts by priority within each group. Returns `{ groups: [{ project, beads: [{id, project, priority, type, status, tags, title}] }] }`.

**`POST /api/launch`** — accepts `{ projectPath, command }`, calls `launchTerminal()`. Prefers iTerm2 via AppleScript (`create window with default profile`), falls back to macOS Terminal. Returns `{ ok: true }` or error.

**`POST /api/brain-capture`** — reads endpoint URL from `settings.customAction.endpoint_url`, reads API key via `readEnvKey(keyVar)` (checks `process.env` first, then `/Users/Shared/arc-secrets.env`). POSTs `{ thought: text }` with Bearer auth. Key var name is configurable via `settings.customAction.api_key_env_var` (default `'CAPTURE_API_KEY'`).

**Helper `readEnvKey(keyName)`** — reads from process.env first, then parses `/Users/Shared/arc-secrets.env` for `export KEY="value"` pattern.

### New modules
- `server/beadsScanner.js` — `bd list` runner + regex parser + project grouper
- `server/terminalLauncher.js` — AppleScript iTerm2 launcher with Terminal fallback; `escapeAppleScript()` helper (escapes `\` then `"`)

### Alert system (`src/hooks/useAlerts.js`)
`firedRef = useRef(new Map())` tracks which thresholds have already fired per projectId across polling cycles. Fires alerts only once per threshold crossing; resets when token count drops below 50% of the limit (indicating a new session started). Inactivity timer reads from `settings.alerts.inactivity_timeout` (default 30 min).

### Audio system (`src/hooks/useAudio.js`)
All 5 sounds synthesized via Web Audio API oscillators — no audio files. Each `ProjectTile` gets its own `AudioContext` (created lazily, cleaned up on unmount via `useEffect` return). Preferences stored in `localStorage` keyed by `audio-${projectId}`. `play()` inlines the localStorage read to avoid stale closure issues.

### Context wiring (`src/context/SessionContext.jsx`)
`useAlerts` call, `settings` fetch, and modal open/close state all moved into `SessionContext` so any component in the tree can access them without prop drilling. Context value exposes: `sessions, stats, loading, settings, alerts, dismiss, launcherOpen, launcherBead, openLauncher, closeLauncher, brainOpen, openBrain, closeBrain`.

### App.jsx restructure
`App.jsx` wraps `SessionProvider` so it can't call `useSession()` directly. An inner `AppLayout` component (inside the provider tree) renders `Header`, `Routes`, `ToastContainer`, `LauncherModal`, and `BrainCaptureModal`.

---

## Decisions made during implementation

- **Modal state in SessionContext** — rather than a separate ModalContext or hoisting state into App (which can't use hooks below SessionProvider), all modal state lives in SessionContext. Tradeoff: every `useSession()` subscriber re-renders on modal toggle. Acceptable for M3 tile counts (5–15 projects).

- **`play()` inlines prefs read** — original `useCallback` captured a stale `getPrefs` reference. Fixed by reading `localStorage` inline inside `play()` so it always reads current prefs.

- **AudioContext cleanup** — added `useEffect` cleanup in `useAudio` to call `ctx.close()` on unmount. Browsers cap concurrent AudioContexts (~6 on some platforms); without cleanup, 10+ tiles would leak contexts.

- **Effect deps in ProjectTile** — `[alerts, project.id, play, getPrefs]` — includes `play` and `getPrefs` per exhaustive-deps rule; `play` is `useCallback`-stable on same `projectId`, so no churn in practice.

- **`bd list` PATH augmentation** — Homebrew `bd` is at `/opt/homebrew/bin`; exec environment doesn't inherit shell PATH. Added explicit PATH prefix to the exec options.

- **"Load into Session" = clipboard copy** — per M3 design decision, clicking Launch on a bead copies the bead title to clipboard (passed as `--context` arg to the launch command) rather than opening a picker modal.

- **Brain API env var** — actual key in arc-secrets.env is `BRAIN_API_KEY`, not `CAPTURE_API_KEY`. The `api_key_env_var` setting in `settings.json` must be set to `"BRAIN_API_KEY"` for live Brain capture to work.

---

## What milestone 4 will need to know

- `SessionContext` now exposes `settings` — M4 can read `settings.customAction` etc. without a separate fetch
- Modal open handlers (`openLauncher(bead?)`, `openBrain()`) are in context — M4 can trigger them from anywhere
- The `useAlerts` hook is fully operational; M4 may want to add new threshold keys to `THRESHOLD_MAP` or new alert types
- `bd list` output format assumed: `<project>-<3charId> [P<n>] [<type>] <status> [<optional-tags>] - <title>` — if the bd CLI output format changes, update the regex in `beadsScanner.js`
- Brain capture sends `{ thought: text }` — verify this matches the Brain API's expected payload shape

---

## Deviations from PRD

- **Tile-click terminal focus skipped** — confirmed deferred to M4+ (too complex for M3, per design decision)
- **"Copy bead title" instead of picker modal** — simplified per M3 design decision; bead title passed as `--context` arg to the claude command
- Audio preferences keyed by `project.id` (not `project.name`) for stability across renames

---

## Commits

| Hash | Description |
|------|-------------|
| `fdce354` | Alert system — useAlerts hook, Toast, ToastContainer |
| `c9d6738` | Audio system — Web Audio synthesis, 5 sounds, per-tile toggle/selector |
| `e4c7706` | Beads sidebar panel — live bd list, grouped by project, Launch/Copy |
| `e609fcf` | Session launcher modal — project/agent/model selectors |
| `4cefd7a` | Brain capture modal + persistent header button |
| `9b23475` | Wire alerts + audio + modals — full integration |
| `e0673c9` | Fix: useAudio cleanup on unmount, effect dep arrays |
| `a6713fa` | Brand audit clean — tokenize raw rgba in style rules |
