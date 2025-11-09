import { getSquareConfig } from './squareClient.js'

/**
 * 🔍 Valida e calcula o valor real dos itens diretamente a partir do catálogo da Square.
 *
 * ➤ Ignora qualquer valor vindo do frontend.
 * ➤ Garante que todos os preços e variações sejam buscados diretamente na Square.
 * ➤ Retorna uma lista de itens verificados, cada um com id, variationId, nome, preço (em centavos) e quantidade.
 *
 * @param {Array} items - Lista de itens [{ id, quantity }]
 * @returns {Object} { valid: boolean, verifiedItems: [], verifiedTotal: number, error?: string }
 */
export async function validateSquareItems(items) {
  try {
    const { baseUrl, token } = getSquareConfig()

    // ⚠️ Verifica se há itens informados
    if (!items?.length) {
      return { valid: false, error: 'Nenhum item informado.' }
    }

    const verifiedItems = []

    // 🔁 Processa cada item individualmente
    for (const item of items) {
      const res = await $fetch(`${baseUrl}/v2/catalog/object/${item.id}`, {
        headers: {
          'Square-Version': '2025-01-23',
          Authorization: `Bearer ${token}`,
        },
      })

      const squareItem = res.object
      const variation = squareItem?.item_data?.variations?.[0]

      // 🔸 Captura ID da variação e preço real em centavos
      const variationId = variation?.id
      const price_cents = variation?.item_variation_data?.price_money?.amount

      // 🚨 Se o preço não existir, aborta a validação
      if (!price_cents) {
        return {
          valid: false,
          error: `Item "${squareItem?.item_data?.name || 'desconhecido'}" sem preço válido.`,
        }
      }

      // ✅ Adiciona o item validado à lista
      verifiedItems.push({
        id: item.id,                              // ID do item principal
        variationId,                              // ID da variação (crucial para o dashboard da Square)
        name: squareItem.item_data.name,          // Nome do item (ex: “Nutella”)
        price_cents,                              // Valor em centavos
        quantity: item.quantity || 1,             // Quantidade (default = 1)
      })
    }

    // 💰 Calcula o total com base nos valores oficiais da Square
    const verifiedTotal = verifiedItems.reduce(
      (sum, i) => sum + i.price_cents * i.quantity,
      0
    )

    // 🔚 Retorna os dados consolidados para uso no checkout
    return { valid: true, verifiedItems, verifiedTotal }
  } catch (err) {
    console.error('Erro na validação com Square:', err)
    return { valid: false, error: 'Erro ao validar itens com a Square.' }
  }
}
