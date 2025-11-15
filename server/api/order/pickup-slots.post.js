// server/api/order/pickup-slots.post.js
// ---------------------------------------------------------
// Calcula o tempo mínimo de pickup com base em:
//   1) Quantidade do pedido
//   2) Fluxo real da loja (últimos 30min e 60min)
// Usa getStoreLoad() que pega Variation IDs automaticamente
// do cache (sweet, savory, croissants).
// ---------------------------------------------------------

import { calculateMinPickupMinutes, generatePickupSlots } from '../../utils/pickupTime.js'
import { getStoreLoad } from '../../utils/getStoreLoad.js'
import { isStoreOpen } from '../../utils/isStoreOpen.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { items } = body || {}
  
  const FORCE_OPEN = process.env.STORE_FORCE_OPEN === 'true'

  // Se não estiver forçando aberto e a loja estiver fechada → retorna closed
  if (!FORCE_OPEN && !isStoreOpen()) {
    return {
      closed: true,
      message: "We are currently closed.",
      slots: [],
      minPickupMinutes: null,
    }
  }


  if (!items || !Array.isArray(items) || !items.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No items provided to calculate pickup time',
    })
  }

  // 1) Calcula tempo mínimo baseado no pedido (<=5: 15min, >5: 30min)
  let minPickupMinutes = await calculateMinPickupMinutes(items)

  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)

  // 2) Verifica fluxo da loja via Square
  // getStoreLoad() já obtém variationIds automaticamente do cache
  const load = await getStoreLoad()

  // Se estiver cheio, força mínimo 30 min
  if (load.last30 >= 15 || load.last60 >= 30) {
    minPickupMinutes = 30
  }

  // 3) Gera slots disponíveis
  const slots = generatePickupSlots(minPickupMinutes)

  return {
    minPickupMinutes,
    slots,
    debug: {
      totalQty,
      storeLoad: load,
    }
  }
})
