# Phase 5: Per-Tile Live Chat Interface — Research

**Researched:** 2026-06-12
**Domain:** Anthropic SDK streaming + Express SSE + React inline panel
**Confidence:** HIGH

---

## Streaming Architecture (SSE vs fetch streaming)

### Recommendation: fetch + ReadableStream (not EventSource)

Use `fetch()` with a `ReadableStream` reader on the frontend — NOT `EventSource`.

**Why not EventSource:**
- `EventSource` is GET-only — you cannot send the conversation history or system prompt in the body
- You'd need to encode history in query params (fragile, URL length limits)
- `EventSource` auto-reconnects; for one-shot chat turns this is a liability

**Why fetch + ReadableStream:**
- POST body carries `{ messages, systemPrompt }` — clean, no encoding hacks
- Response body is a `ReadableStream` — consume with `response.body.getReader()`
- Works in all modern browsers, no polyfill needed
- Matches the Anthropic SDK's streaming output format exactly

### Express SSE setup

```js
// POST /api/chat/:projectId
app.post('/api/chat/:projectId', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()  // CRITICAL — sends headers immediately before body starts

  const stream = client.messages.stream({ ... })

  stream.on('text', (text) => {
    res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
  })

  stream.on('message', () => {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  })

  stream.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    res.end()
  })
})
```

### Frontend fetch + ReadableStream consumer

```js
async function sendMessage(messages, projectId) {
  const response = await fetch(`/api/chat/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    // SSE lines: "data: {...}\n\n"
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const payload = JSON.parse(line.slice(6))
      if (payload.type === 'text') {
        // append to in-progress assistant message
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + payload.text }]
          }
          return prev
        })
      }
      if (payload.type === 'done') {
        // mark last message no longer streaming
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, streaming: false }]
        })
      }
    }
  }
}
```

**Confidence:** HIGH — verified against Anthropic SDK streaming docs and SSE spec.

---

## Anthropic SDK Setup (install, import, env var)

### SDK is NOT in package.json — must install

Current deps do not include `@anthropic-ai/sdk`. Must add:

```bash
npm install @anthropic-ai/sdk
```

Latest stable: `0.x` (verify at npm time — use `npm install @anthropic-ai/sdk@latest`).

### ESM import — fully compatible

`"type": "module"` in package.json is **compatible** with the Anthropic SDK. The SDK ships both CJS and ESM exports.

```js
import Anthropic from '@anthropic-ai/sdk'
```

This is the correct default import. No `.default` unwrapping needed.

### Node.js version compatibility

Node 18+ is required for `fetch` (used internally by the SDK). The existing server already uses ES modules + `fetch` (see `brain-capture` route), confirming Node 18+ is in use.

### Env var pattern — follow existing readEnvKey()

`readEnvKey()` already exists at line 12 of `server/index.js`. Use it verbatim:

```js
const apiKey = readEnvKey('ANTHROPIC_API_KEY')
if (!apiKey) {
  console.warn('[chat] ANTHROPIC_API_KEY not found — /api/chat will return 503')
}

// Instantiate at startup (or lazily per-request if apiKey may not be present at boot)
const anthropic = apiKey ? new Anthropic({ apiKey }) : null
```

**Startup behavior decision:** Lazy instantiation per-request is safer — server starts fine without the key, chat route returns 503 with a clear message when key is absent. This matches the brain-capture pattern (it checks the key per-request rather than failing at startup).

### Streaming method

```js
const stream = anthropic.messages.stream({
  model: 'claude-haiku-4-5-20251001',  // see Model Recommendation
  max_tokens: 1024,
  system: systemPrompt,
  messages: conversationHistory,       // [{role, content}] array
})
```

**Confidence:** HIGH — verified against official Anthropic SDK Node.js docs.

---

## Conversation History Pattern

### Hold state in the tile component (not context)

**Decision: local `useState` in `ChatPanel.jsx`, passed down from `ProjectTile.jsx`.**

Rationale:
- Tiles are stable components — they don't unmount/remount on normal session polling (the 10s interval updates data in-place; tiles are keyed by `project.id`)
- Lifting to `SessionContext` would require storing messages per projectId in context, adding complexity with no benefit for a local dashboard
- If the tile DOES unmount (e.g., project deleted), losing history is acceptable behavior
- The `ChangelogPanel` pattern uses local state; chat follows the same model

```jsx
// In ProjectTile.jsx — parallel to showChangelog
const [showChat, setShowChat] = useState(false)
const [chatHistory, setChatHistory] = useState([])  // [{role, content, streaming?}]
```

Pass `chatHistory` and `setChatHistory` as props to `ChatPanel`:

```jsx
{showChat && (
  <ChatPanel
    project={project}
    messages={chatHistory}
    onMessagesChange={setChatHistory}
  />
)}
```

### Message shape

```js
{
  role: 'user' | 'assistant',
  content: string,
  streaming: boolean,  // true while assistant is mid-stream; UI shows cursor
  timestamp: Date,     // optional, for display
}
```

Strip `streaming` and `timestamp` before sending to API — Anthropic expects plain `{role, content}`.

**Confidence:** HIGH — based on codebase analysis and React state patterns.

---

## System Prompt Construction

### What to inject

```js
function buildSystemPrompt(project, session) {
  const mcpList = session?.mcps?.map(m => m.name).join(', ') || 'none'
  const model   = session?.model || project.model || 'unknown'
  const tokens  = session?.token_count?.toLocaleString() || '0'
  const lastLog = session?.lastChangelog || null  // need to expose this from session data

  return `You are a project assistant for the ADS Command Center dashboard.

Project: ${project.name}
Current model: ${model}
Token count: ${tokens} / 150,000
Active MCPs: ${mcpList}
${lastLog ? `\nLast changelog summary:\n${lastLog}` : ''}

Answer questions about this project's status, help interpret token usage and alerts, and assist with decisions about when to compact, hand off, or continue the session. Be concise and direct.`
}
```

### Where session data comes from

`ProjectTile.jsx` already has access to `project` (passed as prop) and `useSession()` for alerts. The `project` object from `sessions` (via `GET /api/sessions`) includes `token_count`, `model`, `mcps`. The last changelog entry is available by fetching `/api/changelogs/:projectId` — or can be passed as a prop from a parent that already has it.

**Simplest approach:** `ChatPanel` accepts `project` (which has tokens, model, mcps from session scan) and optionally `lastChangelogEntry` as props. `ProjectTile` can pass its existing data without an additional fetch.

**Confidence:** HIGH — all data fields confirmed present in project objects from SessionContext.

---

## Component Structure

```
src/components/chat/
├── ChatPanel.jsx         # inline panel (mirrors ChangelogPanel structure)
└── ChatMessage.jsx       # renders a single message bubble
```

### ChatPanel.jsx skeleton

```jsx
export default function ChatPanel({ project, messages, onMessagesChange }) {
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  // auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input.trim(), streaming: false }
    const assistantMsg = { role: 'assistant', content: '', streaming: true }
    onMessagesChange(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    await streamChat([...messages, userMsg], project, onMessagesChange)
    setStreaming(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((m, i) => <ChatMessage key={i} message={m} />)}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this project..."
          rows={2}
          disabled={streaming}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={streaming || !input.trim()}
        >
          {streaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
```

### ChatMessage.jsx skeleton

```jsx
export default function ChatMessage({ message }) {
  return (
    <div className={`chat-msg chat-msg-${message.role}`}>
      <span className="chat-msg-role">{message.role === 'user' ? 'You' : 'Claude'}</span>
      <p className="chat-msg-content">
        {message.content}
        {message.streaming && <span className="chat-cursor">|</span>}
      </p>
    </div>
  )
}
```

### Integration point in ProjectTile.jsx

Add parallel to the `tile-changelog-section` block (lines 134-143):

```jsx
// After tile-changelog-section
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

**Confidence:** HIGH — structural pattern mirrors existing ChangelogPanel pattern exactly.

---

## Error Handling

### ANTHROPIC_API_KEY missing

**Server startup:** Do not crash. `readEnvKey('ANTHROPIC_API_KEY')` returns null — log a warning, set `anthropic = null`.

**Per-request:** Check `if (!anthropic)` at the top of the route handler, return 503:

```js
if (!anthropic) {
  return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Add to ~/.zshrc or /Users/Shared/arc-secrets.env.' })
}
```

**Frontend:** Detect non-2xx response before attempting to read stream:

```js
const response = await fetch('/api/chat/' + projectId, { ... })
if (!response.ok) {
  const err = await response.json().catch(() => ({ error: 'Unknown error' }))
  // show error in chat panel instead of streaming
  onMessagesChange(prev => [
    ...prev.slice(0, -1),  // remove the empty assistant placeholder
    { role: 'assistant', content: `Error: ${err.error}`, streaming: false }
  ])
  return
}
```

### Stream errors mid-response

The SDK emits an `error` event. Server writes `{ type: 'error', message }` SSE frame and calls `res.end()`. Frontend detects `payload.type === 'error'` and displays it inline as the assistant message content.

### Request abort on panel close

If user closes the chat panel while streaming, set an `AbortController` and pass its signal to fetch. Cancel on unmount:

```js
const abortRef = useRef(null)

async function streamChat(...) {
  abortRef.current = new AbortController()
  const response = await fetch(..., { signal: abortRef.current.signal })
  ...
}

// In ChatPanel cleanup
useEffect(() => () => abortRef.current?.abort(), [])
```

**Confidence:** HIGH — standard fetch abort pattern.

---

## Model Recommendation

**Use `claude-haiku-4-5-20251001` as default.**

Rationale:
- This is a local ops dashboard — latency matters more than deep reasoning
- System prompt injection is lightweight (project name, token count, model, MCP list, one changelog entry)
- Haiku 4.5 is significantly faster and cheaper than Sonnet for this workload
- The context injected (project state) is structured and simple — Haiku handles it well
- Users asking "should I compact now?" or "what happened in the last session?" don't need Sonnet-tier reasoning

**Make model configurable** — add `chat_model` to `settings.json` so the user can upgrade to Sonnet if needed without a code change:

```js
const settings = readConfig('settings.json')
const model = settings.chat?.model || 'claude-haiku-4-5-20251001'
```

**Fallback:** If the user's `ANTHROPIC_API_KEY` is a Haiku-restricted key or they prefer Sonnet, expose this in Settings panel UI later.

**Confidence:** MEDIUM-HIGH — based on task profile analysis; model ID `claude-haiku-4-5-20251001` confirmed as current Haiku 4.5 identifier.

---

## Implementation Gotchas

### 1. `res.flushHeaders()` is mandatory

Without `res.flushHeaders()`, Express buffers the response until `res.end()`. The client waits for the entire response before reading anything — no streaming. Call `res.flushHeaders()` immediately after setting SSE headers.

### 2. SSE chunk splitting in the reader

The `ReadableStream` reader does not guarantee one SSE event per chunk. A single `read()` call may return multiple events concatenated, or a single event split across two reads. The frontend parser must buffer incomplete lines:

```js
let buffer = ''
const chunk = decoder.decode(value)
buffer += chunk
const lines = buffer.split('\n\n')
buffer = lines.pop()  // last element is incomplete (or empty)
for (const block of lines) {
  const line = block.trim()
  if (line.startsWith('data: ')) { ... }
}
```

### 3. Messages must exclude `streaming` field before API send

The Anthropic API rejects unknown fields. Strip `streaming` and `timestamp` before building the history array:

```js
const apiMessages = messages
  .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.streaming))
  .map(({ role, content }) => ({ role, content }))
```

### 4. `max_tokens` required

The SDK throws if `max_tokens` is absent. Use `1024` as default; expose in settings if tuning is needed.

### 5. CORS is already configured globally

`app.use(cors())` at line 35 of `server/index.js` covers the `/api/chat` route automatically. No additional CORS headers needed.

### 6. `text/event-stream` and Vite proxy

If the Vite dev server proxies `/api/*` to Express (check `vite.config.js`), SSE works fine through the proxy. Vite's dev proxy does not buffer SSE responses. Confirm the proxy config includes `changeOrigin: true` — standard setups work without modification.

### 7. History does not persist across page reload

Per the design decision (local component state), history resets on reload. This is intentional for this phase. If persistence is added later, `localStorage` keyed by `project.id` is the lowest-effort path.

### 8. Anthropic SDK ESM named export

The SDK's default export is the `Anthropic` class. Import as:

```js
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey })
```

Not `import { Anthropic }` — that is the type export, not the constructor.

---

## RESEARCH COMPLETE
