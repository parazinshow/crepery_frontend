// server/api/order/pickup-slots.post.js
// ---------------------------------------------------------
// Este endpoint calcula o tempo mínimo de pickup para o cliente,
// considerando:
//   1) quantidade total do pedido
//   2) fluxo real da loja (Square Orders API)
// Depois retorna:
//   - minPickupMinutes = 15 ou 30
//   - slots = lista de "HH:MM" (horários válidos)
// ---------------------------------------------------------

import { calculateMinPickupMinutes, generatePickupSlots } from '../../utils/pickupTime.js'
import { getStoreLoad } from '../../utils/getStoreLoad.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { items } = body || {}

  if (!items || !Array.isArray(items) || !items.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No items provided to calculate pickup time',
    })
  }

  // ============================================================
  // 1) Calcula tempo mínimo baseado apenas no pedido
  //    (<=5 → 15min, >5 → 30min)
  // ============================================================
  let minPickupMinutes = await calculateMinPickupMinutes(items)

  // Quantidade só para debug
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)

  // ============================================================
  // 2) Verifica fluxo real via Square (últimos 30min e 1h)
  //    → Se estiver cheio = força 30min
  //
  //    Critérios:
  //    - >=15 crepes nos últimos 30min → 30min
  //    - >=30 crepes nos últimos 60min → 30min
  //
  //    IMPORTANTE: você deve preencher os variationIds dos CREPES.
  // ============================================================

  const crepeVariationIds = [
    // adicione aqui todos os variation IDs dos crepes:
    // "X1ABC...", "W1ZYT...", ...
  ]

  const load = await getStoreLoad(crepeVariationIds)

  if (load.last30 >= 15 || load.last60 >= 30) {
    minPickupMinutes = 30
  }

  // ============================================================
  // 3) Gera slots de horário a partir do minPickupMinutes final
  // ============================================================
  const slots = generatePickupSlots(minPickupMinutes)

  return {
    minPickupMinutes,
    slots,
    // Para debug (remova depois se quiser)
    debug: {
      totalQty,
      storeLoad: load,
    }
  }
})
