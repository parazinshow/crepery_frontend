import { DateTime } from 'luxon'

// ------------------------------------------------------------
// Verifica se o restaurante está aberto agora ou em um horário
// específico. Baseado no timezone "America/Denver" (MT).
// ------------------------------------------------------------
export function isStoreOpen(date = null) {
  // Usa MT — Mountain Time
  const now = date
    ? DateTime.fromISO(date, { zone: 'America/Denver' })
    : DateTime.now().setZone('America/Denver')

  // Dias (1 = Segunda ... 7 = Domingo)
  const day = now.weekday

  const isOpenDay = day >= 3 && day <= 7  // Wed → Sun

  if (!isOpenDay) return false

  // Horário permitido: 8:30 → 16:30
  const openTime = now.set({ hour: 8, minute: 30 })
  const closeTime = now.set({ hour: 16, minute: 30 })

  return now >= openTime && now <= closeTime
}
