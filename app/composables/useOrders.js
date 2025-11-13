// Composable responsável por toda a lógica de pedidos:
// - Carregar lista de pedidos
// - Marcar pedido como concluído
// - Calcular total dos itens (incluindo addons)
// - Atualizar cache do menu
// - Expor estados reativos: orders, loading, error

import { ref } from 'vue'
import { apiFetch } from '~/utils/apiFetch'
import { useToast } from '~/composables/useToast'

export function useOrders() {
  // Toast para notificações
  const { showToast } = useToast()

  // Lista de pedidos carregados da API
  const orders = ref([])

  // Estado de loading para mostrar "Carregando..."
  const loading = ref(false)

  // Mensagem de erro genérica para o painel
  const error = ref('')

  // Busca a lista de pedidos no backend
  async function loadOrders() {
    loading.value = true
    error.value = ''

    try {
      // Usa apiFetch para já incluir Authorization e tratar 401
      const res = await apiFetch('/api/order/orders')
      orders.value = res.orders || []
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err)

      // Se for 401, apiFetch já limpou token
      if (err?.status === 401 || err?.response?.status === 401) {
        error.value = 'Sessão expirada. Faça login novamente.'
      } else {
        error.value = 'Erro ao carregar pedidos.'
      }
    } finally {
      loading.value = false
    }
  }

  // Marca um pedido como concluído e remove da lista local
  async function markDone(id) {
    try {
      await apiFetch(`/api/order/${id}/done`, {
        method: 'POST',
      })

      // Remove o pedido da lista local para atualizar a UI
      orders.value = orders.value.filter((o) => o.id !== id)
    } catch (err) {
      console.error('Erro ao marcar pedido como concluído:', err)
      showToast('Erro ao marcar pedido!', 'error')
    }
  }

  // Garante que addons sempre sejam devolvidos como array de objetos
  function parseAddons(addons) {
    try {
      if (!addons) return []
      if (Array.isArray(addons)) return addons
      return JSON.parse(addons)
    } catch (e) {
      console.warn('Erro ao parsear addons:', e)
      return []
    }
  }

  // Calcula o total de um item (preço base + addons) em dólares
  function getItemTotal(item) {
    // Garante que temos um array de addons
    const addons = parseAddons(item.addons)

    // Soma o price_cents de cada addon (se for objeto)
    const addonsTotal = addons.reduce(
      (sum, a) =>
        sum + (typeof a === 'object' ? a.price_cents || 0 : 0),
      0
    )

    // Soma o preço base do item com os addons e converte centavos para dólar
    return ((item.price || 0) + addonsTotal) / 100
  }

  // Força atualização do cache do menu no backend
  async function refreshMenu() {
    try {
      await apiFetch('/api/order/menu?refresh=true')
      showToast('Menu atualizado!', 'success')
    } catch (err) {
      console.error('Erro ao atualizar menu:', err)
      showToast('Erro ao atualizar menu', 'error')
    }
  }

  return {
    orders,
    loading,
    error,
    loadOrders,
    markDone,
    parseAddons,
    getItemTotal,
    refreshMenu,
  }
}
