# Milestone 5 — Per-Tile Live Chat Interface

You are entering plan mode to plan and then build milestone 5 of this project.

## Context — read before starting

- Read `_build_plan/milestones/4-changelog-feed-brand-config/milestone-log.md` — current state of the app, especially ProjectTile.jsx and the tile-changelog-section pattern you will mirror.
- Read `_build_plan/milestones/5-live-chat/RESEARCH.md` — streaming architecture, SDK setup, gotchas, and component skeletons. This document contains verified implementation patterns; use them, do not invent alternatives.
- Skim `server/index.js` (lines 1-40) — understand `readEnvKey()` and route registration patterns.
- Skim `src/components/tiles/ProjectTile.jsx` — understand existing state, toggle pattern, and where to insert the chat section.
- Skim `src/components/settings/SettingsForm.jsx` — understand existing section structure to mirror for the Chat status section.
- Skim `src/styles/main.css` — understand existing class naming conventions and token patterns.

## Your task

1. **Plan** the implementation below. Present the plan as a numbered task list with file targets. Ask the clarifying questions at the bottom of this file using AskUserQuestion before proceeding.
2. **After user confirms**, build exactly what is in scope below.
3. **Verify** against every "Done when" criterion before reporting complete.
4. **Run ads-brand-audit** on `src/styles/main.css`. Fix all failures before declaring done.
5. **Write `milestone-log.md`** in `_build_plan/milestones/5-live-chat/milestone-log.md` using this structure:
   - `## What's new in the app` — bulleted user-facing capabilities (non-technical)
   - `## What was built` — implementation detail: routes, components, state pattern, SSE approach
   - `## Decisions` — anything not pre-specified in the PRD or this prompt
   - `## Files modified` — table of file + change description
   - `## Brand audit result` — failures found and fixed; final ✅ confirmation
   - `## Next: Milestone 6` — placeholder noting next work

---

## Scope

### 1. Install Anthropic SDK

```bash
cd /Users/jamescantwell/ai-cli-projects/00-ADS-MASTER/ADS-skills/ads-command-center && npm install @anthropic-ai/sdk@latest
```

Confirm package.json updated before proceeding.

### 2. Server — chat route and status route (`server/index.js`)

**`POST /api/chat`** — accepts `{ projectId, messages, systemPrompt }` in request body.

- Read `ANTHROPIC_API_KEY` via `readEnvKey('ANTHROPIC_API_KEY')` **inside the route handler** (lazy, not at module load). Instantiate `new Anthropic({ apiKey })` inside the handler, not at file top. This prevents startup crash when key is absent.
- If key absent: return `res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Add to ~/.zshrc or /Users/Shared/arc-secrets.env.' })` — do NOT set SSE headers first.
- Set SSE headers, then call `res.flushHeaders()` immediately (mandatory — see Key Context).
- Call `anthropic.messages.stream({ model, max_tokens: 1024, system: systemPrompt, messages: apiMessages })`.
- Read model from `readConfig('settings.json')?.chat?.model` with fallback `'claude-haiku-4-5-20251001'`.
- Strip unknown fields from messages before sending: `messages.map(({ role, content }) => ({ role, content }))`.
- On `stream.on('text', text)`: write `data: ${JSON.stringify({ type: 'text', text })}\n\n`.
- On `stream.on('message', ...)`: write `data: ${JSON.stringify({ type: 'done' })}\n\n`, then `res.end()`.
- On `stream.on('error', err)`: write `data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`, then `res.end()`.
- All non-SSE error returns (503, 400) must be plain JSON — do NOT set SSE headers before these returns.

**`GET /api/chat-status`** — returns `{ configured: true|false }`.

- Calls `readEnvKey('ANTHROPIC_API_KEY')` and returns `{ configured: !!key }`.
- No auth, no side effects.

### 3. Frontend components

**`src/components/chat/ChatPanel.jsx`**

Props: `{ project, messages, onMessagesChange }`

- State: `input` (string), `streaming` (bool), `error` (null|string).
- `abortRef` — `useRef(null)`. On mount (or send), assign `new AbortController()` to `abortRef.current`. Cancel on unmount: `useEffect(() => () => abortRef.current?.abort(), [])`.
- `buildSystemPrompt(project)` helper — inline function using `project.name`, `project.token_count`, `project.model`, `project.mcps` (names only via `.map(m => m.name).join(', ')`). Template from RESEARCH.md system prompt section.
- `handleSend()`:
  1. Guard: `if (!input.trim() || streaming) return`.
  2. Push `{ role: 'user', content: input.trim(), streaming: false }` and `{ role: 'assistant', content: '', streaming: true }` via `onMessagesChange`.
  3. Clear input, set `streaming(true)`, clear `error`.
  4. Call `streamChat(messages, project, onMessagesChange, abortRef)` — see below.
  5. Set `streaming(false)` in finally block.
- `streamChat` async function (can be module-level or inside component):
  1. `POST /api/chat` with `{ projectId: project.id, messages: apiMessages, systemPrompt }`.
  2. If `!response.ok`: parse JSON error, push error message as non-streaming assistant turn, return.
  3. `response.body.getReader()` — decode chunks using buffer strategy from RESEARCH.md (split on `\n\n`, keep partial in buffer).
  4. On `type: text`: append token to last assistant message (the streaming one).
  5. On `type: done`: set `streaming: false` on last assistant message.
  6. On `type: error`: replace last assistant message content with error text.
  7. Handle `AbortError` silently (panel closed mid-stream).
- `handleKeyDown`: `Enter` (no shift) triggers send.
- `bottomRef` — `useRef`. `useEffect` scrolls to bottom on `messages` change.
- Empty state: render `<p className="chat-empty">Ask anything about this project...</p>` when `messages.length === 0`.
- Error display: if `error` is set, render `<p className="chat-error">{error}</p>` above input row.
- Streaming indicator: the in-progress assistant `ChatMessage` receives `streaming={true}` — the pulsing cursor is handled in CSS.

**`src/components/chat/ChatMessage.jsx`**

Props: `{ message }` where `message` is `{ role, content, streaming }`.

- Render `<div className={`chat-msg chat-msg-${message.role}`}>`.
- Role label: `<span className="chat-msg-role">{message.role === 'user' ? 'You' : 'Claude'}</span>`.
- Content: `<p className="chat-msg-content">{message.content}{message.streaming && <span className="chat-cursor" aria-hidden="true" />}</p>`.
- No emoji anywhere.

### 4. `src/components/tiles/ProjectTile.jsx` modifications

Add alongside the existing `showChangelog` state:

```js
const [showChat, setShowChat] = useState(false)
const [chatHistory, setChatHistory] = useState([])
```

Add after the `tile-changelog-section` div (after line 143):

```jsx
<div className="tile-chat-section">
  <button
    className="chat-toggle"
    onClick={() => setShowChat(v => !v)}
    aria-expanded={showChat}
  >
    Chat {showChat ? '▴' : '▾'}
  </button>
  {showChat && (
    <ChatPanel
      project={project}
      messages={chatHistory}
      onMessagesChange={setChatHistory}
    />
  )}
</div>
```

Add import at top: `import ChatPanel from '../chat/ChatPanel.jsx'`

### 5. `src/components/settings/SettingsForm.jsx` — Chat status section

Add a new section after the existing brand section (or as last section):

```jsx
<section className="settings-section">
  <h3 className="settings-section-title">Chat</h3>
  <ChatApiStatus />
</section>
```

`ChatApiStatus` is a small inline component (can be defined in the same file or in `src/components/chat/ChatApiStatus.jsx`):

- On mount, fetch `GET /api/chat-status`.
- Display: `ANTHROPIC_API_KEY: ` followed by either a `configured` or `not-set` indicator.
- Use CSS class `chat-key-ok` for configured, `chat-key-missing` for not set.
- Text: "Configured" or "Not set — add ANTHROPIC_API_KEY to ~/.zshrc".
- No emoji.

### 6. CSS additions (`src/styles/main.css`)

Append a clearly labeled `/* ── Chat ────────────────────────────────────── */` section.

All values MUST use `var(--token-name)`. No hardcoded hex. No hardcoded px for border-radius.

```css
/* ── Chat ────────────────────────────────────── */

.tile-chat-section {
  border-top: 1px solid var(--color-charcoal-10);
  padding-top: var(--space-2);
}

.chat-toggle {
  /* same pattern as .changelog-toggle */
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-charcoal);
  padding: var(--space-1) 0;
  font-family: var(--font-body);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  max-height: 400px;
  margin-top: var(--space-2);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
}

.chat-empty {
  color: var(--color-charcoal-40);
  font-style: italic;
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--space-3) 0;
}

.chat-msg {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  max-width: 88%;
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
}

.chat-msg-user {
  align-self: flex-end;
  background: var(--color-charcoal);
  color: var(--color-white);
}

.chat-msg-assistant {
  align-self: flex-start;
  background: var(--color-white);
  color: var(--color-charcoal);
  border-left: 3px solid var(--color-orange);
  padding-left: var(--space-2);
}

.chat-msg-role {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-heading);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  margin-bottom: var(--space-1);
  opacity: 0.6;
}

.chat-msg-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--color-orange);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: chat-blink 0.9s step-end infinite;
}

@keyframes chat-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.chat-input-row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  border: 1px solid var(--color-charcoal-20);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  resize: none;
  background: var(--color-white);
  color: var(--color-charcoal);
}

.chat-input:focus {
  outline: none;
  border-color: var(--color-orange-ui);
}

.chat-send {
  background: var(--color-charcoal);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-heading);
  cursor: pointer;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.chat-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-send:hover:not(:disabled) {
  background: var(--color-orange-ui);
}

.chat-error {
  color: var(--color-orange-ui);
  font-size: var(--font-size-xs);
  margin: var(--space-1) 0;
}

/* Chat API status in Settings */

.chat-key-ok {
  color: var(--color-charcoal);
  font-size: var(--font-size-sm);
}

.chat-key-ok::before {
  content: '\2713  ';
  color: var(--color-blue);
}

.chat-key-missing {
  color: var(--color-orange-ui);
  font-size: var(--font-size-sm);
}
```

---

## Key context for this milestone

**Do not deviate from these patterns. They are verified against the codebase and the Anthropic SDK.**

1. **`fetch` + `ReadableStream`, not `EventSource`.** EventSource is GET-only — you cannot send conversation history in the body. Use `POST /api/chat`, read `response.body.getReader()`.

2. **`res.flushHeaders()` is mandatory.** Without it, Express buffers the entire SSE response and the client sees nothing until `res.end()`. Set SSE headers, then call `res.flushHeaders()` before touching `stream`.

3. **Buffer SSE chunks in the frontend reader.** A single `read()` call may contain multiple events or a partial event. Use the split-on-`\n\n` + `buffer = lines.pop()` pattern from RESEARCH.md. Do not split naively on `\n`.

4. **Lazy Anthropic instantiation.** Instantiate `new Anthropic({ apiKey })` inside the route handler (after checking key), not at module load. This prevents startup failure when `ANTHROPIC_API_KEY` is absent.

5. **Strip message metadata before API send.** The Anthropic API rejects unknown fields. Always map messages to `{ role, content }` before sending. Filter out any message with `streaming: true` (in-flight messages should not appear in history sent to the API).

6. **`max_tokens` is required.** The SDK throws without it. Default: `1024`.

7. **ESM import.** `import Anthropic from '@anthropic-ai/sdk'` — default import, not named. No `.default` unwrapping.

8. **CORS already configured.** `app.use(cors())` at line 35 of `server/index.js` covers the new route. No additional CORS config needed.

9. **History in ProjectTile, passed as props.** `chatHistory` state lives in `ProjectTile.jsx`. `ChatPanel` receives `messages` and `onMessagesChange` as props. Do NOT put chat history in `SessionContext` or any global store.

10. **All CSS must use `var(--token-name)`.** No hardcoded hex, no hardcoded border-radius in px. Run `ads-brand-audit` on `src/styles/main.css` and fix all failures before marking done. Refer to `public/ads-tokens.css` for available token names.

11. **No emoji anywhere in the UI.** Zero tolerance — this applies to button labels, placeholder text, status indicators, and toggle labels.

12. **Vite proxy.** The dev server proxies `/api/*` to Express (confirmed in `vite.config.js`). SSE works through Vite's proxy without modification.

13. **AbortController on unmount.** If the user closes the chat panel while streaming, the in-flight fetch must be aborted. Use `useEffect(() => () => abortRef.current?.abort(), [])` in `ChatPanel`. Handle `AbortError` silently.

---

## Done when

1. Chat toggle button appears on every project tile, below the Changelog toggle.
2. Clicking the toggle opens a panel showing "Ask anything about this project..." when empty.
3. Typing a message and pressing Enter (or clicking Send) sends the message and streams a response token-by-token.
4. The assistant message shows a pulsing cursor while streaming; cursor disappears when done.
5. Each tile maintains its own conversation history — closing and reopening the panel preserves the thread.
6. The system prompt sent to the API includes: project name, token count, model, active MCP names, and the assistant-role in the template from RESEARCH.md.
7. When `ANTHROPIC_API_KEY` is not set: the chat panel shows "Error: ANTHROPIC_API_KEY not configured..." as an assistant message on first send. No crash, no blank screen.
8. Settings page shows a "Chat" section with "ANTHROPIC_API_KEY: Configured" (or "Not set...").
9. `ads-brand-audit` on `src/styles/main.css` passes with zero failures.
10. No emoji anywhere in added UI or CSS content.

---

## AskUserQuestion — ask these before building

Before starting implementation, ask the user:

1. **Changelog in system prompt?** The spec says the system prompt includes "last changelog preview." Fetching the changelog requires a call to `GET /api/changelogs/:projectId`. Should `ChatPanel` fetch this on open (one extra request), or should we skip changelog in the system prompt for now to keep the implementation simple? (The project object already has tokens, model, and MCPs without any extra fetch.)

2. **Input behavior — Enter to send?** The current spec says Enter sends and Shift+Enter adds a newline. Is that correct, or do you prefer a Send button only (Enter = newline always)?

3. **Chat model configurable in Settings UI?** RESEARCH.md suggests adding a `chat.model` field to `settings.json` readable by the server. Should this milestone also add a model selector to the Settings panel Chat section, or just use the hardcoded Haiku default with the settings.json override documented for manual editing?
