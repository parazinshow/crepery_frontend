// server/utils/time.js
// Funções de formatação de tempo usadas no server (email).
export function formatPickupTimeServer(raw) {
  if (!raw) return ''

  // Caso HH:mm
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':')
    const date = new Date()
    date.setHours(Number(h), Number(m), 0, 0)

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Caso ISO
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return raw
}
