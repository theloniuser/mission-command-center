import { useState, useEffect, useRef } from 'react'
import McpBadge from './McpBadge.jsx'
import ChangelogPanel from '../changelog/ChangelogPanel.jsx'
import { useAudio, SOUNDS } from '../../hooks/useAudio.js'
import { useSession } from '../../context/SessionContext.jsx'
import { useTerminal } from '../../context/TerminalContext.jsx'
import TerminalPane from './TerminalPane.jsx'

const THRESHOLD_80K  = 80000
const THRESHOLD_120K = 120000
const THRESHOLD_150K = 150000

const GAUGE_COLORS = {
  critical: 'var(--color-charcoal)',
  warning:  'var(--color-orange)',
  caution:  'var(--color-blue)',
  healthy:  'var(--color-blue)',
}

function gaugeColor(pct) {
  if (pct >= 1)    return GAUGE_COLORS.critical
  if (pct >= 0.8)  return GAUGE_COLORS.warning
  if (pct >= 0.53) return GAUGE_COLORS.caution
  return GAUGE_COLORS.healthy
}

function PaneStatusBar({ terminalId, project, onAddPane, onClose, isMinimized, onToggleMinimize }) {
  const { sendCommand, getTerminalContent } = useTerminal()
  const tokens = project.token_count ?? 0
  const status = project.status ?? 'no session'

  const [confirmCompact, setConfirmCompact] = useState(false)
  const compactTimer = useRef(null)

  const [handoffPhase, setHandoffPhase] = useState('idle')
  const handoffTimer = useRef(null)

  const [confirmClose, setConfirmClose] = useState(false)
  const closeTimer = useRef(null)

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
      sendCommand(terminalId, '/session-handoff')
      setHandoffPhase('copy')
      clearTimeout(handoffTimer.current)
    } else if (handoffPhase === 'copy' || handoffPhase === 'copied') {
      const text = getTerminalContent(terminalId)
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
      <button className="tsb-minimize" onClick={onToggleMinimize} title={isMinimized ? 'Restore session' : 'Minimize session'} aria-label={isMinimized ? 'Restore session' : 'Minimize session'}>
        <span className="tsb-chevron">{isMinimized ? '∨' : '∧'}</span>
      </button>
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

export default function ProjectTile({ project }) {
  const tokens = project.token_count ?? 0
  const pct = Math.min(tokens / THRESHOLD_150K, 1)
  const status = project.status ?? 'no session'

  const m80  = (THRESHOLD_80K  / THRESHOLD_150K) * 100
  const m120 = (THRESHOLD_120K / THRESHOLD_150K) * 100

  const mcps = project.mcps ?? []
  const spend = project.spend_usd != null ? `~$${project.spend_usd.toFixed(2)}` : null

  const { play, getPrefs, savePrefs } = useAudio(project.id)
  const audioPrefs = getPrefs()
  const [audioEnabled, setAudioEnabled] = useState(audioPrefs.enabled !== false)
  const [selectedSound, setSelectedSound] = useState(audioPrefs.sound || 'chime')

  const { getTerminalIds, openTerminal, addTerminalPane, closeTerminalPane, sendCommand, activeChangelogId, openChangelog } = useTerminal()
  const terminalIds = getTerminalIds(project.id)
  const isExpanded = terminalIds.length > 0
  const [minimizedPanes, setMinimizedPanes] = useState(new Set())

  function toggleMinimize(terminalId) {
    setMinimizedPanes(prev => {
      const next = new Set(prev)
      if (next.has(terminalId)) next.delete(terminalId)
      else next.add(terminalId)
      return next
    })
  }
  const showChangelog = activeChangelogId === project.id
  const changelogRef = useRef(null)

  useEffect(() => {
    if (showChangelog && changelogRef.current) {
      changelogRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [showChangelog])

  const { alerts, dismiss } = useSession()
  const myAlerts = alerts.filter(a => a.projectId === project.id)
  const prevAlertCountRef  = useRef(0)
  const prevNeedsRespRef   = useRef(false)

  useEffect(() => {
    if (myAlerts.length > prevAlertCountRef.current) {
      const prefs = getPrefs()
      if (prefs.enabled !== false) play(prefs.sound || 'chime')
    }
    prevAlertCountRef.current = myAlerts.length
  }, [myAlerts.length, play, getPrefs])

  useEffect(() => {
    const nowNeeds = !!project.needs_response
    if (nowNeeds && !prevNeedsRespRef.current) {
      const prefs = getPrefs()
      if (prefs.enabled !== false) play(prefs.sound || 'chime')
    }
    prevNeedsRespRef.current = nowNeeds
  }, [project.needs_response, play, getPrefs])

  function handleAlertAct(alert) {
    if (alert.action) sendCommand(project.id, alert.action)
    dismiss(alert.id)
  }

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

  if (isExpanded) {
    return (
      <article className="project-tile project-tile--expanded">
        <div className="tile-color-bar" style={{ background: project.color }} />
        {terminalIds.map((terminalId) => {
          const minimized = minimizedPanes.has(terminalId)
          return (
            <div key={terminalId} className={`terminal-pane-wrapper${minimized ? ' terminal-pane-minimized' : ''}`}>
              <TerminalPane projectPath={project.path} projectId={project.id} terminalId={terminalId} />
              <PaneStatusBar
                terminalId={terminalId}
                project={project}
                onAddPane={() => addTerminalPane(project.id)}
                onClose={() => closeTerminalPane(terminalId)}
                isMinimized={minimized}
                onToggleMinimize={() => toggleMinimize(terminalId)}
              />
            </div>
          )
        })}
      </article>
    )
  }

  return (
    <article className="project-tile">
      <div className="tile-color-bar" style={{ background: project.color }} />

      <div className="tile-body">
        <div className="tile-header">
          <h2 className="tile-project-name">{project.name}</h2>
          <div className="tile-header-actions">
            <button
              className="tile-terminal-btn"
              onClick={() => openTerminal(project.id)}
              aria-label="Open terminal"
              title={`Open terminal in ${project.name}`}
            >
              &gt;_
            </button>
            <span className={`tile-status-badge status-${status.replace(' ', '-')}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="tile-meta">
          <span className="tile-meta-item">
            {project.agent_type ?? 'Claude Code'}
          </span>
          <span className="summary-divider" />
          <span className="tile-meta-item">
            {project.model ?? '—'}
          </span>
        </div>

        <div className="tile-gauge">
          <div className="gauge-label">
            <span>Tokens</span>
            <span>{tokens > 0 ? tokens.toLocaleString() : '—'}</span>
          </div>
          <div className="gauge-track">
            <div
              className="gauge-fill"
              style={{ width: `${pct * 100}%`, background: gaugeColor(pct) }}
            />
            <div className="gauge-marker" style={{ left: `${m80}%` }} title="80K — compact" />
            <div className="gauge-marker" style={{ left: `${m120}%` }} title="120K — handoff" />
          </div>
        </div>

        {mcps.length > 0 && (
          <div className="tile-mcps">
            {mcps.map(m => <McpBadge key={m.name} {...m} />)}
          </div>
        )}

        {spend && <div className="tile-spend">{spend}</div>}

        {myAlerts.length > 0 && (
          <div className="tile-alerts">
            {myAlerts.map(a => (
              <div key={a.id} className={`tile-alert tile-alert-${a.type}`} role="alert">
                <span className="tile-alert-msg">{(a.token_count / 1000 | 0) > 0 ? a.message : a.message}</span>
                <div className="tile-alert-actions">
                  {a.actionLabel && (
                    <button className="tile-alert-act" onClick={() => handleAlertAct(a)}>
                      {a.actionLabel}
                    </button>
                  )}
                  <button className="tile-alert-dismiss" onClick={() => dismiss(a.id)} aria-label="Dismiss">x</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="tile-audio">
          <button
            className={`audio-toggle ${audioEnabled ? 'audio-on' : 'audio-off'}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Sound on' : 'Sound off'}
            aria-label={audioEnabled ? 'Disable sound' : 'Enable sound'}
          >
            {audioEnabled ? 'on' : 'off'}
          </button>
          {audioEnabled && (
            <select
              className="audio-select"
              value={selectedSound}
              onChange={handleSoundChange}
              title="Alert sound"
            >
              {SOUNDS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="tile-changelog-section" ref={changelogRef}>
          <button
            className="changelog-toggle"
            onClick={() => openChangelog(project.id)}
            aria-expanded={showChangelog}
          >
            Changelog {showChangelog ? '▴' : '▾'}
          </button>
          {showChangelog && <ChangelogPanel projectId={project.id} />}
        </div>
      </div>
    </article>
  )
}
