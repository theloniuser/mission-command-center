# Milestone 4 — Changelog Feed and Brand Config

**Status:** COMPLETE  
**Session:** 2026-06-12  
**Completion gate:** ads-brand-audit zero ❌ failures ✅

---

## What was built

### Changelog Feed
- `server/changelogScanner.js` — reads `changes.YYYY-MM-DD.HH-MM.md` files from a project path, parses date from filename, generates 5-line preview, returns reverse-chron array
- `GET /api/changelogs/:projectId` — looks up project path, calls scanner, returns `[]` on error
- `src/components/changelog/ChangelogEntry.jsx` — collapsed (date + preview) / expanded (full markdown) accordion with `aria-expanded`
- `src/components/changelog/ChangelogPanel.jsx` — fetches + polls 30s, renders ChangelogEntry list
- `src/components/tiles/ProjectTile.jsx` — inline Changelog toggle at tile bottom; `showChangelog` state, `ChangelogPanel` conditional render

API confirmed: 173 changelogs found for ADS-skills project; `[]` for unknown project ID.

### Brand Config System
- `public/ads-tokens.css` — copy of src/styles/ads-tokens.css for Vite static serving
- `public/generic-tokens.css` — first-class neutral slate/indigo theme; all 33 main.css token names mapped; dark mode via `[data-theme="dark"]`
- `src/context/BrandContext.jsx` — dynamic `<link id="brand-tokens">` href swap; `applyBrand()` instant on Settings save; no restart required
- `index.html` — `<link id="brand-tokens">` as first stylesheet in `<head>`
- `src/styles/main.css` — removed `@import './ads-tokens.css'` (tokens now from dynamic link)
- `src/components/settings/SettingsForm.jsx` — ADS / Generic / Custom mode selector; Custom shows token CSS path + logo path + primary color fields; `applyBrand()` called on save
- `src/components/layout/Header.jsx` — `Logo` component: ADS mode → SVG swap by theme; Generic → "Command Center" wordmark; Custom + logo_path → `/api/brand-asset` img
- `GET /api/brand-css?path=...` — serves custom token CSS file (`.css` extension validated)
- `GET /api/brand-asset?path=...` — streams custom logo (`.svg/.png/.jpg/.jpeg` validated)

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| Dynamic `<link>` swap, not CSS injection | Avoids Vite bundling issues; token files live in `public/` as static assets |
| Brand-tokens as first `<link>` in index.html | Ensures tokens available before React hydration |
| Inline changelog accordion in tile | User chose over modal/sidebar; keeps context without navigation |
| Generic theme: neutral slate + indigo | User approved; system-font stack (no Typekit dependency in Generic mode) |
| `applyBrand()` on SettingsForm save | Instant visual feedback without page reload |

---

## Brand Audit Findings and Fixes (ads-brand-audit)

Audit run against `index.html` + `src/styles/main.css` with ADS mode active.

### Failures fixed

| Location | Issue | Fix |
|----------|-------|-----|
| `--hub-surface-h: #f5f5f5` | Hardcoded hex not in ADS palette | `var(--color-charcoal-05)` |
| `.bead-priority.p1 { color: var(--color-white) }` | White on Arc Orange = 2.53:1 WCAG fail | `var(--color-charcoal)` (4.63:1) |
| `.bead-priority.p2 { color: var(--color-white) }` | White on Lens Blue = 2.83:1 WCAG fail | `var(--color-charcoal)` (5.3:1) |
| `.sidebar-error { color: var(--color-orange) }` | Raw orange text on light bg = 2.9:1 fail | `var(--color-orange-ui)` (4.5:1) |
| `.modal-error { color: var(--color-orange) }` | Same | `var(--color-orange-ui)` |
| `.brain-status.error { color: var(--color-orange) }` | Same | `var(--color-orange-ui)` |
| `.toast { border-radius: 6px }` | Non-token value | `var(--radius-md)` |
| `.modal-panel { border-radius: 10px }` | Non-token value | `var(--radius-lg)` (9px) |
| `.gauge-track/.fill { border-radius: 3px }` | Non-token value | `var(--radius-sm)` (2px) |
| `.gauge-marker { border-radius: 1px }` | Non-token value | `var(--radius-sm)` |
| `.toast-dismiss { border-radius: 3px }` | Non-token value | `var(--radius-sm)` |
| `.toast-act { border-radius: 4px }` | Hardcoded | `var(--radius-md)` |
| `.audio-toggle { border-radius: 4px }` | Hardcoded | `var(--radius-md)` |
| `.audio-select { border-radius: 4px }` | Hardcoded | `var(--radius-md)` |
| `.bead-priority { border-radius: 3px }` | Non-token value | `var(--radius-sm)` |
| `.bead-btn { border-radius: 4px }` | Hardcoded | `var(--radius-md)` |
| `.modal-close { border-radius: 4px }` | Hardcoded | `var(--radius-md)` |
| `.modal-field select/input { border-radius: 5px }` | Non-token value | `var(--radius-md)` |
| `.modal-btn-cancel/primary { border-radius: 5px }` | Non-token value | `var(--radius-md)` |
| `.brain-textarea { border-radius: 5px }` | Non-token value | `var(--radius-md)` |
| `.header-brain-btn { border-radius: 5px }` | Non-token value | `var(--radius-md)` |
| `index.html` brand-tokens link order | Typekit preceded brand-tokens | Swapped — brand-tokens is now first |

### Final audit result: ✅ zero ❌ failures

---

## Files modified

| File | Change |
|------|--------|
| `server/changelogScanner.js` | Created |
| `server/index.js` | +3 routes: changelogs, brand-css, brand-asset |
| `public/ads-tokens.css` | Created (static copy) |
| `public/generic-tokens.css` | Created (Generic theme) |
| `src/context/BrandContext.jsx` | Created |
| `src/components/changelog/ChangelogEntry.jsx` | Created |
| `src/components/changelog/ChangelogPanel.jsx` | Created |
| `src/components/tiles/ProjectTile.jsx` | +changelog toggle |
| `src/components/settings/SettingsForm.jsx` | +Custom fields, applyBrand call |
| `src/components/layout/Header.jsx` | Brand-aware Logo component |
| `src/styles/main.css` | -@import, +changelog CSS, +brand fixes |
| `index.html` | +brand-tokens link, fixed link order |
| `src/App.jsx` | +BrandProvider wrap |

---

## Next: Milestone 5 — Live Chat Interface

Per-tile interactive chat window to send prompts to Claude and see responses inline.
Plan with `/gsd:new-milestone` or add `_build_plan/milestones/5-live-chat/prompt.md`.
