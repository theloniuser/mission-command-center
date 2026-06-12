import Toast from './Toast.jsx'
export default function ToastContainer({ alerts, onDismiss }) {
  if (!alerts.length) return null
  return (
    <div className="toast-container" aria-label="Alerts">
      {alerts.map(a => <Toast key={a.id} alert={a} onDismiss={onDismiss} />)}
    </div>
  )
}
