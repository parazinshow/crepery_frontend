// server/utils/getStoreLoad.js
// ------------------------------------------------------------
// Consulta a Square Orders API e conta quantos itens de produção
// foram vendidos nos últimos:
//
//   - 30 minutos (>=15 → loja cheia)
//   - 60 minutos (>=30 → loja cheia)
//
// Usa variationIds do cache (sweet + savory + croissants).
// ------------------------------------------------------------

import { getSquareConfig } from './squareClient.js'
import { getCrepeVariationIds } from './getCrepeVariationIds.js'

export async function getStoreLoad() {
  const { baseUrl, token } = getSquareConfig()

  const LOCATION_ID = process.env.NODE_ENV === 'production'
    ? process.env.SQUARE_PRODUCTION_LOCATION_ID
    : process.env.SQUARE_SANDBOX_LOCATION_ID

  const SQUARE_VERSION = '2025-01-23'

  const variationIds = await getCrepeVariationIds()

  function isoMinutesAgo(min) {
    const now = new Date()
    now.setMinutes(now.getMinutes() - min)

    // Remove milissegundos — Square às vezes rejeita
    return now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }

  async function fetchOrders(start_at) {
    try {
      const res = await $fetch(`${baseUrl}/v2/orders/search`, {
        method: 'POST',
        headers: {
          'Square-Version': SQUARE_VERSION,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: {
          location_ids: [LOCATION_ID],
          limit: 200,
          query: {
            filter: {
              date_time_filter: { created_at: { start_at } },
              state_filter: { states: ['COMPLETED'] }
            }
          }
        }
      })    

      return res.orders || []
    } catch (err) {
      console.error('⚠️ Falha ao consultar Orders API:', err)
      return []
    }
  }

  function countProductionItems(orders) {
    let total = 0
    for (const order of orders) {
      for (const item of order.line_items || []) {
        if (variationIds.includes(item.catalog_object_id)) {
          total += Number(item.quantity || 0)
        }
      }
    }
    return total
  }

  const last30Orders = await fetchOrders(isoMinutesAgo(30))
  const last60Orders = await fetchOrders(isoMinutesAgo(60))

  return {
    last30: countProductionItems(last30Orders),
    last60: countProductionItems(last60Orders),
  }
}
