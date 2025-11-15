// server/utils/pickupTime.js
// ---------------------------------------------------------
// Helpers para cálculo de horário mínimo de pickup e slots
// disponíveis com base no tamanho do pedido e carga da cozinha
// (última 1h de vendas).
// ---------------------------------------------------------

import prisma from './db.js'

// 🔥 FLAG DE TESTE (vindo do Render)
const FORCE_OPEN = process.env.STORE_FORCE_OPEN === 'true'

function nowInMountainTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" })
  );
}

/**
 * Calcula o tempo mínimo de pickup (em minutos) baseado:
 *  - quantidade total de itens do pedido (somando quantity)
 *  - quantidade de crepes vendidos na última 1h
 *
 * Regras:
 *  - até 5 unidades  → mínimo 15 min
 *  - mais de 5       → mínimo 30 min
 *  - se a soma de quantities na última 1h > 30 → mínimo 30 min
 */
export async function calculateMinPickupMinutes(cartItems = []) {
  if (FORCE_OPEN) {
  // 🚀 Em modo teste sempre 5 minutos
  return 5
  }
  // Total de unidades nesse pedido
  const totalQty = cartItems.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0),
    0
  )

  let minMinutes = totalQty <= 5 ? 15 : 30

  // Soma de quantities vendidos na última hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const agg = await prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      order: {
        // usa createdAt do modelo Order via relação
        createdAt: { gte: oneHourAgo },
      },
    },
  })

  const soldLastHour = Number(agg._sum.quantity || 0)

  if (soldLastHour > 30) {
    // cozinha cheia → nunca menos que 30 min
    minMinutes = Math.max(minMinutes, 30)
  }

  return minMinutes
}

// Horário da loja — Mountain Time
const OPEN_HOUR = 8
const OPEN_MIN = 30
const CLOSE_HOUR = 16
const CLOSE_MIN = 30

// Dias abertos: 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
const OPEN_DAYS = [3, 4, 5, 6, 0]

/**
 * Gera slots em intervalos de 10 minutos respeitando:
 *  - horário mínimo (minMinutes)
 *  - horário de funcionamento (8:30 → 16:30)
 *  - dias de funcionamento (Wed–Sun)
 */
export function generatePickupSlots (minMinutes) {
  if (FORCE_OPEN) {
    // 🚀 Em modo teste: sempre retorna 7 slots válidos nos próximos minutos
    const slots = []
    const now = nowInMountainTime()

    for (let i = 0; i < 7; i++) {
      const slot = new Date(now.getTime() + (minMinutes + i * 5) * 60000)
      const hh = slot.getHours().toString().padStart(2, '0')
      const mm = slot.getMinutes().toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }

    return slots
  }

  const slots = []

  const now = nowInMountainTime()

  // Verifica se está fechado HOJE (em Mountain Time)
  const dow = now.getDay()
  if (!OPEN_DAYS.includes(dow)) {
    return [] // fechado hoje → nenhum horário
  }

  // Define horário inicial baseado no mínimo + agora
  let start = new Date(now.getTime() + minMinutes * 60 * 1000)

  // Força início = no mínimo 8:30 (sempre em Mountain Time)
  const openToday = nowInMountainTime()
  openToday.setHours(OPEN_HOUR, OPEN_MIN, 0, 0)

  if (start < openToday) {
    // garante que o start = exatamente 08:30, com mesma data e fuso
    start = new Date(openToday.getTime())
  }

  // Define limite de fechamento: 16:30
  const closeToday = nowInMountainTime()
  closeToday.setHours(CLOSE_HOUR, CLOSE_MIN, 0, 0)

  // Loop: gerar até 9 slots (00 minutos) mas respeitar horário de fechamento
  for (let i = 0; i < 9; i++) {
    const slot = new Date(start.getTime() + i * 10 * 60 * 1000)

    if (slot > closeToday) break // passou do horário → parar

    const hh = slot.getHours().toString().padStart(2, '0')
    const mm = slot.getMinutes().toString().padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }

  return slots
}

