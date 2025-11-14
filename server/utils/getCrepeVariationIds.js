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

  const catalog = cache?.data
  if (!catalog) {
    console.warn("⚠️ Nenhum cache.data encontrado!")
    return []
  }

  const categories = catalog.categories
  if (!categories) {
    console.warn("⚠️ Nenhum categories dentro de cache.data!")
    return []
  }

  const {
    sweetItems = [],
    savoryItems = [],
    croissants = [],
  } = categories

  const productionItems = [
    ...sweetItems,
    ...savoryItems,
    ...croissants,
  ]

  const variationIds = productionItems
    .map(item => item.variations?.[0]?.id)
    .filter(Boolean)
    
  return variationIds
}
