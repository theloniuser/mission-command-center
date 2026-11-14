import { useState, useEffect, useRef } from 'react'
import McpBadge from './McpBadge.jsx'
import ChangelogPanel from '../changelog/ChangelogPanel.jsx'
import { useAudio, SOUNDS } from '../../hooks/useAudio.js'
import { useSession } from '../../context/SessionContext.jsx'
import { useTerminal } from '../../context/TerminalContext.jsx'

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

export default function ProjectTile({ project, onMove }) {
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

  const { getTerminalIds, openTerminal, sendCommand, activeChangelogId, openChangelog } = useTerminal()
  const isExpanded = getTerminalIds(project.id).length > 0

  // The pane status bar edits the same prefs while this tile is hidden; resync on return
  useEffect(() => {
    if (isExpanded) return
    const prefs = getPrefs()
    setAudioEnabled(prefs.enabled !== false)
    setSelectedSound(prefs.sound || 'chime')
  }, [isExpanded])
  const showChangelog = activeChangelogId === project.id
  const changelogRef = useRef(null)

  useEffect(() => {
    if (showChangelog && changelogRef.current) {
      changelogRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [showChangelog])

  const { alerts, dismiss } = useSession()
  const myAlerts = alerts.filter(a => a.projectId === project.id)
  const prevNeedsRespRef = useRef(null)

  // Only sound: the chime when Claude is done or waiting on input (needs_response).
  // Token-threshold and inactivity alerts show in the sidebar list but stay silent.
  useEffect(() => {
    const nowNeeds = !!project.needs_response
    if (prevNeedsRespRef.current !== null && nowNeeds && !prevNeedsRespRef.current) {
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

  // Open panes render in TerminalWorkspace; the hooks above keep running so alert sounds still fire
  if (isExpanded) return null

  return (
    <article className="project-tile">
      <div className="tile-color-bar" style={{ background: project.color }} />

      <div className="tile-body">
        <div className="tile-header">
          <h2 className="tile-project-name">{project.name}</h2>
          <div className="tile-header-actions">
            {onMove && (
              <>
                <button className="tile-terminal-btn" onClick={() => onMove(-1)}
                  aria-label={`Move ${project.name} earlier`} title="Move earlier">&larr;</button>
                <button className="tile-terminal-btn" onClick={() => onMove(1)}
                  aria-label={`Move ${project.name} later`} title="Move later">&rarr;</button>
              </>
            )}
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
              aria-label="Alert sound"
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
            Changelog <span className="tsb-chevron">{showChangelog ? '∧' : '∨'}</span>
          </button>
          {showChangelog && <ChangelogPanel projectId={project.id} />}
        </div>
      </div>
    </article>
  )
}
