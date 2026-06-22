import { useState } from 'react'
import { useBrand } from '../../context/BrandContext.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function SettingsForm({ settings, onSaved }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { applyBrand, applyTitle } = useBrand()

  function handleAlerts(e) {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setForm(f => ({ ...f, alerts: { ...f.alerts, [e.target.name]: val } }))
    setSaved(false)
  }

  function handleCustomAction(e) {
    setForm(f => ({ ...f, customAction: { ...f.customAction, [e.target.name]: e.target.value } }))
    setSaved(false)
  }

  function handleBrand(e) {
    setForm(f => ({ ...f, brand: { ...f.brand, [e.target.name]: e.target.value } }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      applyBrand(form.brand)
      applyTitle(form.title)
      setSaved(true)
      onSaved(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Dashboard title */}
      <section className="settings-section">
        <h2 className="settings-section-title">Dashboard</h2>
        <div className="form-group">
          <label>Title</label>
          <input
            className="form-input"
            name="title"
            value={form.title || ''}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setSaved(false) }}
            placeholder="Mission Command Center"
          />
        </div>
      </section>

      {/* Alert thresholds */}
      <section className="settings-section">
        <h2 className="settings-section-title">Alert Thresholds</h2>
        <div className="threshold-grid">
          <div className="form-group">
            <label>Compact nudge <span>(tokens)</span></label>
            <input
              className="form-input"
              type="number"
              name="compact_threshold"
              value={form.alerts.compact_threshold}
              onChange={handleAlerts}
              min={0}
              step={1000}
            />
          </div>
          <div className="form-group">
            <label>Handoff warning <span>(tokens)</span></label>
            <input
              className="form-input"
              type="number"
              name="handoff_threshold"
              value={form.alerts.handoff_threshold}
              onChange={handleAlerts}
              min={0}
              step={1000}
            />
          </div>
          <div className="form-group">
            <label>Full protocol <span>(tokens)</span></label>
            <input
              className="form-input"
              type="number"
              name="protocol_threshold"
              value={form.alerts.protocol_threshold}
              onChange={handleAlerts}
              min={0}
              step={1000}
            />
          </div>
          <div className="form-group">
            <label>Inactivity <span>(minutes)</span></label>
            <input
              className="form-input"
              type="number"
              name="inactivity_timeout"
              value={form.alerts.inactivity_timeout}
              onChange={handleAlerts}
              min={1}
            />
          </div>
        </div>
      </section>

      {/* Custom action */}
      <section className="settings-section">
        <h2 className="settings-section-title">Custom Action</h2>
        <div className="form-group">
          <label>Button label</label>
          <input
            className="form-input"
            name="name"
            value={form.customAction.name}
            onChange={handleCustomAction}
            placeholder="Capture to Brain"
          />
        </div>
        <div className="form-group">
          <label>Endpoint URL</label>
          <input
            className="form-input"
            name="endpoint_url"
            value={form.customAction.endpoint_url}
            onChange={handleCustomAction}
            placeholder="https://your-brain-api.com/capture"
          />
        </div>
        <div className="form-group">
          <label>API key env var <span>(name only -- never the value)</span></label>
          <input
            className="form-input"
            name="api_key_env_var"
            value={form.customAction.api_key_env_var}
            onChange={handleCustomAction}
            placeholder="CAPTURE_API_KEY"
          />
        </div>
      </section>

      {/* Brand config */}
      <section className="settings-section">
        <h2 className="settings-section-title">Brand</h2>
        <div className="form-group">
          <label>Theme mode</label>
          <select
            className="form-select"
            name="theme_mode"
            value={form.brand.theme_mode}
            onChange={handleBrand}
          >
            <option value="Generic">Generic (default)</option>
            <option value="ADS">ADS</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {form.brand.theme_mode === 'Custom' && (
          <>
            <div className="form-group">
              <label>Token CSS path <span>(absolute path to .css file)</span></label>
              <input
                className="form-input"
                name="token_css_path"
                value={form.brand.token_css_path}
                onChange={handleBrand}
                placeholder="/path/to/your-tokens.css"
              />
            </div>
            <div className="form-group">
              <label>Logo path <span>(absolute path to .svg, .png, or .jpg)</span></label>
              <input
                className="form-input"
                name="logo_path"
                value={form.brand.logo_path}
                onChange={handleBrand}
                placeholder="/path/to/logo.svg"
              />
            </div>
            <div className="form-group">
              <label>Primary color <span>(optional hex override)</span></label>
              <input
                className="form-input"
                name="primary_color"
                value={form.brand.primary_color}
                onChange={handleBrand}
                placeholder="#6366f1"
              />
            </div>
          </>
        )}
      </section>

      <div className="form-actions">
        {saved && (
          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--hub-text-fade)', alignSelf: 'center' }}>
            Saved.
          </span>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
