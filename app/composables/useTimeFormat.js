// Composable para formatar horários de retirada
export function useTimeFormat() {

  function formatPickupTime(raw) {
    if (!raw) return ''

    // Se já vier "HH:mm"
    if (/^\d{2}:\d{2}$/.test(raw)) {
      const [hStr, mStr] = raw.split(':')
      const h = Number(hStr)
      const m = Number(mStr)

      let period = 'AM'
      let displayH = h

      if (h === 0) {
        displayH = 12
        period = 'AM'
      } else if (h < 12) {
        period = 'AM'
      } else if (h === 12) {
        period = 'PM'
      } else {
        displayH = h - 12
        period = 'PM'
      }

      return `${displayH}:${mStr} ${period}`
    }

    // Se vier formato inesperado (fallback)
    return raw
  }

  return { formatPickupTime }
}
