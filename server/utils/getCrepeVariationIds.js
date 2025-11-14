// server/utils/getCrepeVariationIds.js
// ---------------------------------------------------------
// Extrai variationIds automaticamente do cache do Square Catalog.
// Contamos como "produção":
//   - Crepes doces (sweetItems)
//   - Crepes salgados (savoryItems)
//   - Croissants
//
// OBS: Só pega o primeiro variation de cada item (o padrão Regular).
// ---------------------------------------------------------

import { readCatalogCache } from './readCatalogCache.js'

export async function getCrepeVariationIds() {
  const cache = await readCatalogCache()

  if (!cache?.categories) return []

  const {
    sweetItems = [],
    savoryItems = [],
    croissants = [],
  } = cache.categories

  const productionItems = [
    ...sweetItems,
    ...savoryItems,
    ...croissants,
  ]

  return productionItems
    .map(item => item.variations?.[0]?.id)
    .filter(Boolean)
}
