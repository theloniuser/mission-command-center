import McpBadge from './McpBadge.jsx'

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

export default function ProjectTile({ project }) {
  const tokens = project.token_count ?? 0
  const pct = Math.min(tokens / THRESHOLD_150K, 1)
  const status = project.status ?? 'no session'

  const m80  = (THRESHOLD_80K  / THRESHOLD_150K) * 100
  const m120 = (THRESHOLD_120K / THRESHOLD_150K) * 100

  const mcps = project.mcps ?? []
  const spend = project.spend_usd != null ? `~$${project.spend_usd.toFixed(2)}` : null

  return (
    <article className="project-tile">
      <div className="tile-color-bar" style={{ background: project.color }} />

      <div className="tile-body">
        <div className="tile-header">
          <h2 className="tile-project-name">{project.name}</h2>
          <span className={`tile-status-badge status-${status.replace(' ', '-')}`}>
            {status}
          </span>
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
      </div>
    </article>
  )
}
