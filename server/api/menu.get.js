// ===============================================
// 🧾 Endpoint: Listar Itens do Catálogo da Square
// -----------------------------------------------
// Este endpoint faz uma requisição à API da Square
// para buscar o catálogo completo, filtra apenas os
// itens de menu, anexa imagens (se existirem) e retorna
// um array organizado com nome, descrição, preço e imagem.
// ===============================================

import { getSquareConfig } from '../utils/squareClient.js' // 🔧 Importa utilitário com credenciais e URL base da Square API

export default defineEventHandler(async () => {
  // 1️⃣ Obtém baseUrl e token da Square API (definidos em squareClient.js)
  const { baseUrl, token } = getSquareConfig()
  
  // 2️⃣ Busca o catálogo completo de objetos (ITEMs, IMAGEs, CATEGORYs, etc)
  const res = await $fetch(`${baseUrl}/v2/catalog/list`, {
    headers: {
      'Square-Version': '2025-01-23',  // versão fixa para compatibilidade da API
      Authorization: `Bearer ${token}`, // autenticação via token de acesso
    },
  })

  // ⚠️ Caso não existam objetos, retorna erro descritivo
  if (!res.objects) {
    return { error: 'Nenhum item encontrado no catálogo', fullResponse: res }
  }

  // 3️⃣ Filtra apenas os objetos do tipo ITEM (exclui imagens, categorias etc.)
  //    Em seguida, mapeia os dados principais de cada item (nome, descrições e variações)
  const items = res.objects
    .filter(obj => obj.type === 'ITEM')
    .map(item => {
      // Cada item pode ter várias variações (ex: tamanhos, sabores etc.)
      const variations =
        item.item_data.variations?.map(v => ({
          id: v.id, // ID da variação (necessário para pedidos)
          name: v.item_variation_data.name,
          price_cents: v.item_variation_data.price_money?.amount || 0, // preço em centavos
          currency: v.item_variation_data.price_money?.currency || 'USD',
        })) || []

      return {
        id: item.id,
        name: item.item_data.name,
        description: item.item_data.description,
        image_ids: item.item_data.image_ids || [], // lista de IDs das imagens associadas
        variations,
      }
    })

  // 4️⃣ Coleta todos os IDs de imagem únicos dos itens encontrados
  const imageIds = [
    ...new Set(items.flatMap(item => item.image_ids)), // evita repetições
  ].filter(Boolean) // remove null/undefined

  // 5️⃣ Função auxiliar que busca imagens em lotes para evitar rate limit
  //    Faz várias requisições GET a /v2/catalog/object/{image_id}
  const fetchImagesInBatches = async (ids, batchSize = 10) => {
    const urls = {} // armazena as URLs resultantes de cada image_id

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const promises = batch.map(id =>
        $fetch(`${baseUrl}/v2/catalog/object/${id}`, {
          headers: {
            'Square-Version': '2025-01-23',
            Authorization: `Bearer ${token}`,
          },
        })
        .then(r => {
          // Associa o ID à URL retornada (ou null se não houver)
          urls[id] = r?.object?.image_data?.url || null
        })
        .catch(() => {
          // Se ocorrer erro (ex: imagem não encontrada), define como null
          urls[id] = null
        })
      )

      // Espera todas as requisições do lote terminarem antes de seguir
      await Promise.all(promises)
    }

    return urls // retorna o mapa { imageId: url }
  }

  // 6️⃣ Busca todas as imagens necessárias em lotes (10 por vez)
  const imageMap = await fetchImagesInBatches(imageIds)

  // 7️⃣ Junta os dados dos itens com a URL da primeira imagem associada
  const finalItems = items.map(item => ({
    ...item,
    image_url: imageMap[item.image_ids?.[0]] || null, // adiciona URL direta
  }))

  // 8️⃣ Retorna a lista final de itens do menu prontos para exibir no frontend
  return { items: finalItems }
})
