import { getSquareConfig } from '../utils/squareClient.js'

export default defineEventHandler(async () => {
  const { baseUrl, token } = getSquareConfig()
  
  // 1️⃣ Busca o catálogo completo
  const res = await $fetch(`${baseUrl}/v2/catalog/list`, {
    headers: {
      'Square-Version': '2025-01-23',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.objects) {
    return { error: 'Nenhum item encontrado no catálogo', fullResponse: res }
  }

  // 2️⃣ Pega apenas os itens de menu
  const items = res.objects
    .filter(obj => obj.type === 'ITEM')
    .map(item => {
      const variations =
        item.item_data.variations?.map(v => ({
          id: v.id,
          name: v.item_variation_data.name,
          price: v.item_variation_data.price_money
            ? v.item_variation_data.price_money.amount / 100
            : null,
          currency: v.item_variation_data.price_money?.currency || 'USD',
        })) || []

      return {
        id: item.id,
        name: item.item_data.name,
        description: item.item_data.description,
        image_ids: item.item_data.image_ids || [],
        variations,
      }
    })

  // 3️⃣ Coleta todos os image_ids únicos
  const imageIds = [
    ...new Set(items.flatMap(item => item.image_ids)),
  ].filter(Boolean)

  // 4️⃣ Faz requisições em lotes (10 por vez) pra evitar rate limit
  const fetchImagesInBatches = async (ids, batchSize = 10) => {
    const urls = {}

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const promises = batch.map(id =>
        $fetch(`${baseUrl}/v2/catalog/object/${id}`, {
          headers: {
            'Square-Version': '2025-01-23',
            Authorization: `Bearer ${token}`,
          },
        }).then(r => {
          urls[id] = r?.object?.image_data?.url || null
        }).catch(() => {
          urls[id] = null
        })
      )

      await Promise.all(promises)
    }

    return urls
  }

  const imageMap = await fetchImagesInBatches(imageIds)

  // 5️⃣ Junta os dados com a URL da imagem
  const finalItems = items.map(item => ({
    ...item,
    image_url: imageMap[item.image_ids?.[0]] || null,
  }))

  return { items: finalItems }
})
