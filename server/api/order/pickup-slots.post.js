// server/api/order/pickup-slots.post.js
// ---------------------------------------------------------
// Recebe itens do carrinho e devolve:
//  - minPickupMinutes: tempo mínimo calculado
//  - slots: lista de horários "HH:MM" válidos
// Usado pelo checkout.vue pra preencher o <select>.
// ---------------------------------------------------------

import { calculateMinPickupMinutes, generatePickupSlots } from '../../utils/pickupTime.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { items } = body || {}

  if (!items || !Array.isArray(items) || !items.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No items provided to calculate pickup time',
    })
  }

  // Pode usar items direto (só precisa de quantity)
  const minPickupMinutes = await calculateMinPickupMinutes(items)
  const slots = generatePickupSlots(minPickupMinutes)

  return {
    minPickupMinutes,
    slots,
  }
})
