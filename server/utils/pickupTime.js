// server/utils/pickupTime.js
// ---------------------------------------------------------
// Helpers para cálculo de horário mínimo de pickup e slots
// disponíveis com base no tamanho do pedido e carga da cozinha
// (última 1h de vendas).
// ---------------------------------------------------------

import prisma from './db.js'

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

/**
 * Gera uma lista de horários de pickup (strings "HH:MM")
 * começando em `minMinutes` a partir de agora, em passos de 5min,
 * por ~90 minutos pra frente (18 slots).
 */
export function generatePickupSlots(minMinutes) {
  const slots = []

  const now = new Date()
  const start = new Date(now.getTime() + minMinutes * 60 * 1000)

  for (let i = 0; i < 18; i++) {
    const slot = new Date(start.getTime() + i * 5 * 60 * 1000)
    const hh = slot.getHours().toString().padStart(2, '0')
    const mm = slot.getMinutes().toString().padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }

  return slots
}
