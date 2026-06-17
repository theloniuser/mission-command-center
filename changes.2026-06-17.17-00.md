# Session: 2026-06-17 afternoon — ADS brand audit + texture fix

**Focus**: ADS brand compliance pass on Command Center

---

## Summary

Ran a full 30-check ADS brand audit against the Command Center React source. Found 3 failures and 4 warns. Fixed all 7. Most significant: the Arc texture SVG was completely absent from the header despite the CSS infrastructure being in place. Also corrected an ADA contrast failure on modal buttons and removed stale duplicate token declarations.

---

## Changes Made

### Arc texture added to header

**File**: `src/components/layout/Header.jsx:34–43`

Added canonical 3-path Arc texture SVG inside `<header className="site-header">` before `header-inner`. Uses `stroke="currentColor"` so it inherits `--hub-text` (charcoal in light, white in dark). Positioned and sized via existing token vars (`--nav-texture-right`, `--nav-texture-top`, `--nav-texture-width`).

### `.site-texture` CSS added

**File**: `src/styles/main.css` — added after `.site-header` block

The CSS positioning rules for `.site-texture` were missing entirely (only the dark-mode opacity override existed). Added:
- `position: absolute`, `right/top/width` via tokens, `pointer-events: none`, `z-index: 0`
- `opacity: var(--nav-texture-opacity)` (0.13 default)
- Light mode override: `opacity: var(--nav-texture-opacity-light)` (0.20)
- Dark mode override: `opacity: 0.12`

### Removed duplicate hub token declarations

**File**: `src/styles/main.css:1–39` (replaced)

The top of `main.css` redeclared all `--hub-*` tokens that are already defined in `ads-tokens.css` (loaded first via `<link>` in `index.html`). Removed the duplicate `:root {}` block and `html[data-theme="dark"] {}` block. Kept only the 3 tokens unique to this app: `--hub-focus-ring`, `--hub-shadow-modal`, `--hub-overlay`. This means `ads-tokens.css` is now the canonical source for all hub tokens — updates there ripple correctly without being shadowed.

### modal-btn-primary ADA fix

**File**: `src/styles/main.css` — `.modal-btn-primary`

Was: `background: var(--color-orange-ui); color: var(--color-white)` — white on #b75b00 ≈ 4.36:1, fails WCAG AA.
Now: `background: var(--color-orange); color: var(--color-charcoal)` — consistent with `.btn-primary`, passes at 4.63:1.

### Emoji removed from CSS

**File**: `src/styles/main.css` — `.folder-browser-item::before`

Was: `content: '📁'` — zero tolerance per ADS brand rules.
Now: `content: '/'` with `color: var(--hub-text-fade)` — directory indicator, no emoji.

### site-title border and margin

**File**: `src/styles/main.css` — `.site-title`

- `border-left: 2px` → `border-left: 3px` (canonical eyebrow stripe is always 3px)
- `margin-left: 30px` → `margin-left: var(--space-4)` (24px — eliminates raw px)

### mcp-badge radius

**File**: `src/styles/main.css` — `.mcp-badge`

`border-radius: var(--radius-md)` → `var(--radius-sm)` — badges/chips use `--radius-sm` (2px) per spec.

---

## Issues Encountered

### Duplicate tokens were shadowing ads-tokens.css

`main.css` had a `--hub-surface-h: var(--color-charcoal-05)` that differed from `ads-tokens.css`'s `#f5f5f5`. Because Vite injects main.css after the `<link>` tag, main.css was overriding the canonical values. Removing main.css duplicates restores single-source-of-truth.

---

## Running State

- Dev server: `http://localhost:5173/ads-command-center/` (Vite on 5173, Express already running on 3001)
- Background processes: none
- Open worktrees: none

---

## Verification

Opened in browser, confirmed:
- ✅ Light mode: Arc curve + ball visible in upper-right header at ~0.13 opacity, charcoal stroke on white
- ✅ Dark mode: texture switches to white stroke at 0.12 opacity on near-black
- ✅ No regressions in logo, nav, summary bar, project tiles

---

## Decisions Made

1. **Emoji replacement**: Used `/` (slash) instead of removing entirely — preserves visual affordance for folder items in the browser UI without using emoji
2. **Duplicate token removal**: Removed all duplicates rather than reconciling differences — ads-tokens.css is authoritative; local overrides were causing drift
3. **Terminal chrome hex values** (warns c): Left `#1c1c1c`, `#1e1e1e`, `#f8f8f7`, `#efefee` in expanded tile CSS — these are xterm/terminal emulator surface colors, intentionally outside the brand system, not page UI

---

## Next Steps

- [ ] Sound persistence verified correct — no changes needed
- [ ] Consider adding `--hub-toast-bg`, `--hub-toast-text`, `--hub-badge-live-bg`, `--hub-accent-muted` to the local tokens block if they're needed (currently they're in ads-tokens.css but not used by Command Center)
