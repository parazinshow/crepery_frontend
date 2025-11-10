// ===============================================
// 🧾 Endpoint: Listar Itens do Catálogo da Square
// -----------------------------------------------
// - Busca catálogo completo da Square (ITEMs, CATEGORYs, TAX)
// - Organiza em categorias (Sweet, Savory, Drinks, Extras)
// - Anexa URLs das imagens em batches
// - Retorna estrutura completa + cache local + imposto
// ===============================================

import { promises as fs } from 'fs'
import { requireAuth } from '../../utils/auth.js'
import path from 'path'
import { getSquareConfig } from '../../utils/squareClient.js'

const CACHE_PATH = path.resolve('./server/cache/catalog.json')

export default defineEventHandler(async (event) => {
  const { baseUrl, token } = getSquareConfig()
  const query = getQuery(event)

  // ✅ se estiver forçando refresh, exige autenticação
  const forceRefresh = query.refresh === 'true'
  if (forceRefresh) {
    await requireAuth(event)
  }

  // 1️⃣ Tenta usar cache local (24h) — apenas se NÃO for refresh manual
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'))
      const ageMs = Date.now() - new Date(cached.timestamp).getTime()
      if (ageMs < 24 * 60 * 60 * 1000 && cached.data) {
        return cached.data
      }
    } catch (_) {}
  }

  // 2️⃣ Busca o catálogo completo
  const res = await $fetch(`${baseUrl}/v2/catalog/list`, {
    headers: {
      'Square-Version': '2025-01-23',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.objects) {
    return { error: 'Nenhum item encontrado no catálogo', fullResponse: res }
  }   

  // 🔹 Separa objetos por tipo
  const items = res.objects.filter(o => o.type === 'ITEM')
  const categories = res.objects.filter(o => o.type === 'CATEGORY')
  const taxes = res.objects.filter(o => o.type === 'TAX')

  // 3️⃣ Extrai imposto ativo
  const activeTax = taxes.find(t => t.tax_data?.enabled)
  const tax = {
    id: activeTax?.id || null,
    name: activeTax?.tax_data?.name || 'Vail Sales Tax',
    percentage: Number(activeTax?.tax_data?.percentage || 9.4),
  }

  // 4️⃣ Identifica categorias principais e subcategorias
  const sweetCat = categories.find(c => c.category_data.name === 'Sweet Crepe')
  const savoryCat = categories.find(c => c.category_data.name === 'Savory Crepe')
  const drinksCat = categories.find(c => c.category_data.name === 'Drinks')

  const sweetExtraCats = categories.filter(c => c.category_data.parent_category?.id === sweetCat?.id)
  const savoryExtraCats = categories.filter(c => c.category_data.parent_category?.id === savoryCat?.id)

  // 5️⃣ Função auxiliar para normalizar itens
  const normalizeItem = item => {
    const variations =
      item.item_data.variations?.map(v => ({
        id: v.id,
        name: v.item_variation_data.name,
        price_cents: v.item_variation_data.price_money?.amount || 0,
        currency: v.item_variation_data.price_money?.currency || 'USD',
      })) || []

    return {
      id: item.id,
      name: item.item_data.name,
      description: item.item_data.description_plaintext || '',
      image_ids: item.item_data.image_ids || [],
      variations,
    }
  }

  // 6️⃣ Classifica os itens por categoria
  const sweetItems = []
  const savoryItems = []
  const drinks = []
  const toppingsSweet = []
  const toppingsSavory = []

  for (const item of items) {
    const catId = item.item_data.reporting_category?.id

    if (sweetCat && catId === sweetCat.id) sweetItems.push(item)
    else if (savoryCat && catId === savoryCat.id) savoryItems.push(item)
    else if (drinksCat && catId === drinksCat.id) drinks.push(item)
    else if (sweetExtraCats.some(c => c.id === catId)) toppingsSweet.push(item)
    else if (savoryExtraCats.some(c => c.id === catId)) toppingsSavory.push(item)
  }

  // 7️⃣ Normaliza os itens para o formato padrão
  const allItems = [
    ...sweetItems,
    ...savoryItems,
    ...drinks,
    ...toppingsSweet,
    ...toppingsSavory,
  ].map(normalizeItem)

  // 🔍 Coleta todos os IDs de imagem únicos
  const imageIds = [
    ...new Set(allItems.flatMap(i => i.image_ids)),
  ].filter(Boolean)

  // 8️⃣ Busca imagens em batches (mesma lógica do seu código original)
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
        })
          .then(r => {
            urls[id] = r?.object?.image_data?.url || null
          })
          .catch(() => {
            urls[id] = null
          })
      )
      await Promise.all(promises)
    }
    return urls
  }

  const imageMap = await fetchImagesInBatches(imageIds)

  // 9️⃣ Aplica URLs de imagem em todos os grupos
  const applyImages = arr =>
    arr.map(i => ({
      ...normalizeItem(i),
      image_url: imageMap[i.item_data.image_ids?.[0]] || null,
    }))

  const payload = {
    tax,
    categories: {
      sweetItems: applyImages(sweetItems),
      savoryItems: applyImages(savoryItems),
      drinks: applyImages(drinks),
      toppingsSweet: applyImages(toppingsSweet),
      toppingsSavory: applyImages(toppingsSavory),
    },
  }

  // 🔒 🔟 Salva no cache (24h)
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true })
    await fs.writeFile(
      CACHE_PATH,
      JSON.stringify({ timestamp: new Date(), data: payload }, null, 2),
      'utf8'
    )
  } catch (err) {
    console.error('⚠️ Falha ao salvar cache:', err)
  }

  // ✅ Retorna estrutura final completa
  return payload
})
