export default function Toast({ alert, onDismiss }) {
  function handleAct() {
    if (alert.action) navigator.clipboard.writeText(alert.action)
    onDismiss(alert.id)
  }
  return (
    <div className={`toast toast-${alert.type}`} role="alert" aria-live="assertive">
      <span className="toast-message">{alert.message}</span>
      <div className="toast-actions">
        {alert.actionLabel && <button className="toast-act" onClick={handleAct}>{alert.actionLabel}</button>}
        <button className="toast-dismiss" onClick={() => onDismiss(alert.id)}>x</button>
      </div>
    </div>
  )
}
