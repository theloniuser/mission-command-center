export default function McpBadge({ name, engaged, last_used }) {
  const time = last_used ? new Date(last_used).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  const tooltip = time ? `${name}: last used ${time}` : name
  return (
    <span className={`mcp-badge ${engaged ? 'mcp-engaged' : 'mcp-idle'}`} title={tooltip}>
      {name}
    </span>
  )
}
