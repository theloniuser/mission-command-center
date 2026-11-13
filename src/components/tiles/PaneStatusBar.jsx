import { useState, useEffect, useRef } from 'react'
import { useTerminal } from '../../context/TerminalContext.jsx'
import { useAudio, SOUNDS } from '../../hooks/useAudio.js'

export default function PaneStatusBar({
  terminalId, project, onAddPane, onClose, isMinimized, onToggleMinimize,
  isDocked, canDockRight, dockDisabledReason, dockCandidates, onDockRight, onUndock,
  joinsDock, onJoinDock, axis, canMoveEarlier, canMoveLater, onMove,
}) {
  const { sendCommand, getTerminalContent, getTerminalLineCount } = useTerminal()
  const tokens = project.token_count ?? 0
  const status = project.status ?? 'no session'

  const [confirmCompact, setConfirmCompact] = useState(false)
  const compactTimer = useRef(null)

  const [handoffPhase, setHandoffPhase] = useState('idle')
  const handoffTimer = useRef(null)
  const handoffMarkerRef = useRef(0)

  const [confirmClose, setConfirmClose] = useState(false)
  const closeTimer = useRef(null)

  const [pickerOpen, setPickerOpen] = useState(false)

  // Same per-project prefs the inactive tile reads, so changes here apply to both
  const { play, getPrefs, savePrefs } = useAudio(project.id)
  const [audioEnabled, setAudioEnabled] = useState(() => getPrefs().enabled !== false)
  const [selectedSound, setSelectedSound] = useState(() => getPrefs().sound || 'chime')

  function toggleAudio() {
    const next = !audioEnabled
    setAudioEnabled(next)
    savePrefs({ enabled: next, sound: selectedSound })
  }

  function handleSoundChange(e) {
    setSelectedSound(e.target.value)
    savePrefs({ enabled: audioEnabled, sound: e.target.value })
    play(e.target.value)
  }

  useEffect(() => () => { clearTimeout(compactTimer.current); clearTimeout(handoffTimer.current); clearTimeout(closeTimer.current) }, [])

  function handleCompactClick() {
    if (confirmCompact) {
      sendCommand(terminalId, '/compact')
      setConfirmCompact(false)
      clearTimeout(compactTimer.current)
    } else {
      setConfirmCompact(true)
      clearTimeout(compactTimer.current)
      compactTimer.current = setTimeout(() => setConfirmCompact(false), 3000)
    }
  }

  function handleHandoffClick() {
    if (handoffPhase === 'idle') {
      setHandoffPhase('confirm')
      clearTimeout(handoffTimer.current)
      handoffTimer.current = setTimeout(() => setHandoffPhase('idle'), 3000)
    } else if (handoffPhase === 'confirm') {
      handoffMarkerRef.current = getTerminalLineCount(terminalId)
      sendCommand(terminalId, '/session-handoff')
      setHandoffPhase('copy')
      clearTimeout(handoffTimer.current)
    } else if (handoffPhase === 'copy' || handoffPhase === 'copied') {
      // /session-handoff is often typed directly into the CLI rather than triggered via the
      // confirm click above, so handoffMarkerRef may never be set — and the scrollback can
      // contain earlier mentions of "Session Handoff" (e.g. the skill's own template text).
      // Always take the LAST heading match in the buffer, never the first.
      const extractHandoff = (source) => {
        const matches = [...source.matchAll(/^.*Session Handoff.*$/gim)]
        return matches.length ? source.slice(matches[matches.length - 1].index) : null
      }
      const scoped = getTerminalContent(terminalId, handoffMarkerRef.current)
      const text = extractHandoff(scoped) ?? extractHandoff(getTerminalContent(terminalId)) ?? scoped
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setHandoffPhase('copied')
          handoffTimer.current = setTimeout(() => setHandoffPhase('idle'), 2000)
        })
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.cssText = 'position:fixed;top:-9999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setHandoffPhase('copied')
        handoffTimer.current = setTimeout(() => setHandoffPhase('idle'), 2000)
      }
    }
  }

  return (
    <div className={`tile-status-bar${isMinimized ? ' tile-status-bar--minimized' : ''}`}>
      <span className="tsb-name">{project.name}</span>
      <span className="tsb-divider" />
      <span className={`tsb-badge status-${status.replace(' ', '-')}`}>{status}</span>
      <span className="tsb-divider" />
      <span className="tsb-item">{project.agent_type ?? 'Claude Code'}</span>
      <span className="tsb-divider" />
      <span className="tsb-item">{project.model ?? '—'}</span>
      <span className="tsb-divider" />
      <span className="tsb-item">{tokens > 0 ? `${tokens.toLocaleString()} tokens` : '—'}</span>
      <span className="tsb-divider" />
      <span className={`tsb-cmd-btn${confirmCompact ? ' tsb-cmd-btn--confirm' : ''}`} role="button" onClick={handleCompactClick}>
        {confirmCompact ? 'confirm?' : '/compact'}
      </span>
      <span className={`tsb-cmd-btn${handoffPhase !== 'idle' ? ' tsb-cmd-btn--confirm' : ''}`} role="button" onClick={handleHandoffClick}>
        {handoffPhase === 'idle'    && '/handoff'}
        {handoffPhase === 'confirm' && 'confirm?'}
        {handoffPhase === 'copy'    && 'copy handoff'}
        {handoffPhase === 'copied'  && '✓ copied'}
      </span>
      <span className="tsb-cmd-btn" role="button" onClick={onAddPane} title="Add a new session pane">+session</span>
      <span className="tsb-audio">
        <span
          className={`tsb-cmd-btn${audioEnabled ? '' : ' tsb-cmd-btn--disabled'}`}
          role="button"
          onClick={toggleAudio}
          title={audioEnabled ? 'Sound on' : 'Sound off'}
        >
          {audioEnabled ? 'sound' : 'muted'}
        </span>
        {audioEnabled && (
          <select className="tsb-audio-select" value={selectedSound} onChange={handleSoundChange} title="Alert sound" aria-label="Alert sound">
            {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
      </span>
      {(canMoveEarlier || canMoveLater) && (
        <span className="tsb-move">
          {[[-1, canMoveEarlier, axis === 'x' ? '\u2190' : '\u2191', 'earlier'],
            [1, canMoveLater, axis === 'x' ? '\u2192' : '\u2193', 'later']].map(([dir, can, glyph, word]) => (
            <span
              key={dir}
              className={`tsb-cmd-btn${can ? '' : ' tsb-cmd-btn--disabled'}`}
              role="button"
              aria-disabled={!can}
              aria-label={`Move ${project.name} ${word}`}
              title={`Move ${axis === 'x' ? (dir < 0 ? 'left' : 'right') : (dir < 0 ? 'up' : 'down')}`}
              onClick={() => can && onMove(dir)}
            >
              {glyph}
            </span>
          ))}
        </span>
      )}
      <span className="tsb-dock-wrap">
        <span
          className={`tsb-cmd-btn${canDockRight ? '' : ' tsb-cmd-btn--disabled'}`}
          role="button"
          aria-disabled={!canDockRight}
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
          title={canDockRight
            ? (joinsDock ? 'Add this session to the dock' : 'Dock another session to the right')
            : dockDisabledReason}
          onClick={() => {
            if (!canDockRight) return
            if (joinsDock) onJoinDock()
            else setPickerOpen(open => !open)
          }}
        >
          {joinsDock ? 'dock' : <>dock &rsaquo;</>}
        </span>
        {pickerOpen && (
          <div className="tsb-dock-picker" role="menu">
            {dockCandidates.map(c => (
              <button
                key={c.terminalId}
                role="menuitem"
                className="tsb-dock-option"
                onClick={() => { setPickerOpen(false); onDockRight(c.terminalId) }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </span>
      {isDocked && (
        <span className="tsb-cmd-btn" role="button" onClick={onUndock} title="Return to full width">
          undock
        </span>
      )}
      {!isDocked && (
        <button className="tsb-minimize" onClick={onToggleMinimize} title={isMinimized ? 'Restore session' : 'Minimize session'} aria-label={isMinimized ? 'Restore session' : 'Minimize session'}>
          <span className="tsb-chevron">{isMinimized ? '∨' : '∧'}</span>
        </button>
      )}
      <button
        className={`tsb-close${confirmClose ? ' tsb-cmd-btn--confirm' : ''}`}
        onClick={() => {
          if (confirmClose) {
            clearTimeout(closeTimer.current)
            onClose()
          } else {
            setConfirmClose(true)
            clearTimeout(closeTimer.current)
            closeTimer.current = setTimeout(() => setConfirmClose(false), 3000)
          }
        }}
        aria-label="Close session"
      >
        {confirmClose ? 'close?' : '✕'}
      </button>
    </div>
  )
}
