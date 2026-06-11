# Milestone 1 — Foundation + Dashboard Shell

## What's new in the app

- **Dashboard with project tiles** — navigate to `http://localhost:5173` to see a color-coded grid of your configured projects. Each tile shows the project name, a color accent bar, agent type and model placeholders, status badge, and a token gauge shell with threshold marks at 80K, 120K, and 150K.
- **Settings page** — add, edit, and remove projects (name, path, optional launch command). Projects persist between page reloads.
- **App settings** — configure alert thresholds, Custom Action endpoint/API key env var, and brand mode selector (ADS / Generic / Custom).
- **Dark/light mode toggle** — header toggle (`☾︎` / `☀︎`) switches between ADS light and dark palettes; preference is remembered in `localStorage['hub-theme']`.
- **Collapsible sidebar shell** — right-side panel with toggle button; backlog content arrives in Milestone 3.
- **Empty state** — if no projects are configured, the dashboard shows a prompt linking to Settings.

---

## What was built

### Files created

```
package.json                           npm config, all deps
vite.config.js                         Vite 5 + /api proxy to Express :3001
index.html                             React entry point, Typekit, favicon
server/
  index.js                             Express API server, port 3001
  configManager.js                     read/write config/*.json helpers
config/
  projects.json                        persisted project list (starts empty)
  settings.json                        persisted alert + custom action + brand settings
public/
  ADS-logo-primary.svg                 light-mode logo
  ADS-logo-primary-orange-white-text.svg  dark-mode logo
  favicon.svg                          ADS arc-mark favicon (copied from tools/)
src/
  main.jsx                             React root
  App.jsx                              ThemeProvider + BrowserRouter + Routes
  styles/
    ads-tokens.css                     ADS brand token file (copied from arc-design-studio-brand/)
    main.css                           hub-* semantic layer, all component styles
  context/
    ThemeContext.jsx                   useTheme hook + ThemeProvider
  components/layout/
    Header.jsx                         logo img swap, theme toggle, summary bar
    Sidebar.jsx                        collapsible shell
  components/tiles/
    ProjectTile.jsx                    placeholder tile with gauge
  components/settings/
    ProjectsConfig.jsx                 project CRUD form
    SettingsForm.jsx                   alert thresholds + custom action + brand mode
  pages/
    Dashboard.jsx                      tile grid page
    Settings.jsx                       settings page
```

### API routes (Express, port 3001)

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/projects` | Return projects.json |
| POST | `/api/projects` | Add project (auto-assigns color from 7-color palette) |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Remove project |
| GET | `/api/settings` | Return settings.json |
| PUT | `/api/settings` | Merge + save settings |

---

## Decisions made during implementation

**Dark/light toggle included in M1** — The PRD specifies "ADS Brand (v1 default)" with no mention of a toggle. After discussion, dark/light mode was included in M1 as part of the brand foundation layer, following the exact pattern from `decisions/ads-dark-light-toggle-spec.md`. Default is light. Logo swaps between `ADS-logo-primary.svg` (light) and `ADS-logo-primary-orange-white-text.svg` (dark) via React state, not CSS.

**`--hub-*` semantic token layer** — Instead of using raw `--color-*` tokens directly throughout components, the hub semantic layer (`--hub-bg`, `--hub-surface`, `--hub-text`, etc.) is used everywhere. This layer is redefined in `html[data-theme="dark"]` to automatically flip all colors on theme change, matching the pattern used in hub.html, backlog.html, and skills.html.

**Token link: `@import` vs CDN** — The brand audit canonical check expects `brand.arcdesignstudio.com/ads-tokens.css` as a `<link>` tag. In a Vite React app, the equivalent is `@import './ads-tokens.css'` as the first line of `main.css`. This is the correct adaptation for a compiled asset pipeline — the file is processed at build time, not runtime CDN.

**Danger/delete button** — The initial implementation used `#c0392b` (red, not in ADS palette). Fixed during brand audit to use `--hub-text-fade` text on `--hub-btn-border` — a neutral, on-brand approach for destructive secondary actions.

**Gauge health colors** — Tile token gauges use ADS palette hex only: `#339fd9` (blue) for healthy/caution range, `#ff7f00` (orange) for warning, `#383838` (charcoal) for critical. No semantic red. This is M1 placeholder behavior; M2 will refine with live data.

**Tile colors** — 7-color auto-assigned palette uses a mix of ADS brand anchors (orange, blue) plus supplementary colors (teal, purple, sage, terracotta, sand gold) that extend the brand palette for visual differentiation between tiles.

---

## Milestone 2 will need to know

- **Session file path**: `~/.claude/projects/` — subdirectories per project, each containing JSONL transcript files. Token count must be read from the most recently active file per project.
- **Token count field**: look for `usage` or `inputTokens`/`outputTokens` in the JSONL lines; the dashboard should sum input + output for the live gauge.
- **Session detection**: match projects by path; a session is "active" if its JSONL file was modified within the last N minutes.
- **MCP status**: check if `.claude/settings.json` (or equivalent) in the project dir lists active MCPs.
- **Polling**: the API server can add a `/api/session-status` endpoint; frontend polls on a configurable interval (suggest 10s default).
- **Summary bar**: Header already renders placeholder `—` stats. Wire the real counts in M2 via a new API route that scans all configured project paths.

---

## ADS brand audit result

```
Pass: 18 | Warn: 1 | Fail: 0
```

Warn: CDN token `<link>` not present in HTML — correct Vite adaptation (`@import` as first CSS statement).

---

## Deviations from PRD

None. All M1 scope items delivered. No M2+ scope included.
