<script setup>
  // Página principal do painel admin
  // - Usa useAdminAuth para lidar com login/logout
  // - Usa useOrders para carregar e gerenciar pedidos
  // - Controla o polling (setInterval) para atualizar pedidos periodicamente

  import {ref, onMounted, onUnmounted} from 'vue'
  import {useAdminAuth} from '~/composables/useAdminAuth'
  import {useOrders} from '~/composables/useOrders'
  import {useTimeAgo} from '~/composables/useTimeAgo'
  import {useTimeFormat} from '~/composables/useTimeFormat'

  // Extrai funções dos composables
  const {timeAgo} = useTimeAgo()
  const {showToast} = useToast()
  const {formatPickupTime} = useTimeFormat()

  // Campo do PiN de login
  const pin = ref('')

  // Erro exibido apenas na área de login
  const loginError = ref('')

  // Pega estados e funções de autenticação
  const {isAuthenticated, login, clearToken} = useAdminAuth()

  // Pega estados e funções de pedidos
  const {
    orders,
    loading,
    error,
    loadOrders,
    markDone,
    parseAddons,
    getItemTotal,
    refreshMenu,
  } = useOrders()

  // ID do intervalo de polling, para podermos limpar depois
  let intervalId = null

  // Estado para controlar animação de loading ao marcar pedido como feito
  const loadingDone = ref({})

  // Quando a página monta, se já estiver autenticado (token no localStorage),
  // carrega os pedidos e começa o polling a cada 30s
  onMounted(() => {
    if (isAuthenticated.value) {
      loadOrders()
      intervalId = setInterval(loadOrders, 30000)
    }
  })

  // Quando sai da página, limpa o intervalo pra não ficar rodando em background
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  // Faz login usando o composable de auth e, em caso de sucesso,
  // carrega pedidos e inicia o polling
  async function handleLogin() {
    loginError.value = ''

    try {
      await login(pin.value)
      await loadOrders()
      showToast('Panel unlocked!', 'success')

      if (!intervalId) {
        intervalId = setInterval(loadOrders, 30000)
      }
    } catch (err) {
      loginError.value = 'Invalid PIN.'
      showToast('Wrong PIN', 'error')
    }
  }

  // Marca um pedido como feito, com feedback visual
  async function handleMarkDone(orderId) {
    // bloqueia o botão
    loadingDone.value[orderId] = true

    try {
      await markDone(orderId) // chama o composable original
      showToast('Order marked as done!', 'success')
    } catch (err) {
      showToast('Error marking order', 'error')
    } finally {
      // libera botão
      loadingDone.value[orderId] = false
    }
  }

  // Faz logout limpando o token e parando o polling
  function logout() {
    clearToken()

    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Define a cor da borda do ticket com base na idade do pedido
  const ticketColor = (createdAt) => {
    const age = Date.now() - new Date(createdAt).getTime()

    if (age < 5 * 60 * 1000) return 'border-green-300' // muito recente
    if (age < 10 * 60 * 1000) return 'border-yellow-300' // médio
    return 'border-red-300' // muito antigo
  }
</script>

<template>
  <div class="background w-full min-h-[calc(100vh)]">
    <div class="p-6 max-w-6xl mx-auto page-body">
      <!-- Título -->

      <!-- LOGO -->
      <NuxtLink to="/" class="flex items-center justify-center pb-0">
        <img
          src="/images/logo-image.png"
          class="h-10 lg:h-20 mr-3"
          alt="Logo image"
        />
        <img src="/images/logo-text.png" class="h-10 lg:h-14" alt="Logo text" />
      </NuxtLink>

      <h1 class="page-title mb-4 text-2xl lg:text-4xl text-center">
        Online Orders Panel
      </h1>

      <!-- LOGIN -->
      <div
        v-if="!isAuthenticated"
        class="max-w-sm mx-auto p-6 shadow-lg rounded-xl space-y-4 border border-primary-300"
      >
        <h2 class="text-xl text-center">Admin Access</h2>

        <input
          v-model="pin"
          type="password"
          maxlength="6"
          placeholder="Enter PIN"
          class="border border-primary-300 px-4 py-3 rounded w-full text-center text-xl tracking-widest"
        />

        <button @click="handleLogin" class="default-button w-full py-3">
          Unlock Panel
        </button>

        <p v-if="loginError" class="text-red-600 text-center text-sm">
          {{ loginError }}
        </p>
      </div>

      <!-- =============================== -->
      <!--       PAINEL ADMIN REAL         -->
      <!-- =============================== -->

      <div v-else>
        <!-- Top Bar -->
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-2xl font-bold">Pending Orders</h2>

          <div class="flex gap-3">
            <button
              @click="refreshMenu"
              class="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg shadow"
            >
              Update Menu
            </button>

            <button
              @click="logout"
              class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow"
            >
              Logout
            </button>
          </div>
        </div>

        <!-- Mensagem de erro -->
        <p v-if="error" class="text-red-600 mb-4 text-lg font-semibold">
          {{ error }}
        </p>

        <!-- Loading -->
        <p v-if="loading" class="text-gray-600 text-lg">Loading orders...</p>

        <!-- =============================== -->
        <!--          TICKETS GRID           -->
        <!-- =============================== -->
        <div v-else>
          <div
            v-if="orders.length"
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <div
              v-for="order in orders"
              :key="order.id"
              class="bg-white shadow-xl p-5 rounded-xl border-2 transition"
              :class="ticketColor(order.createdAt)"
            >
              <!-- TOP LINE -->
              <div class="flex justify-between items-center mb-1">
                <h2 class="text-xl font-bold">#{{ order.dailyNumber }}</h2>

                <button
                  @click="handleMarkDone(order.id)"
                  :disabled="loadingDone[order.id]"
                  class="bg-green-600 hover:bg-green-700 text-white text-lg px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  <span v-if="loadingDone[order.id]">⏳...</span>
                  <span v-else>✔ Ready </span>
                </button>
              </div>

              <p class="text-gray-600 text-sm -mt-1">📧 {{ order.email }}</p>

              <!-- Created & Pickup -->
              <div class="mt-2">
                <p class="text-xs text-gray-500">
                  Created: {{ timeAgo(order.createdAt) }}
                </p>

                <p class="text-lg font-semibold text-indigo-700">
                  Pickup: {{ formatPickupTime(order.pickupTime) }}
                </p>
              </div>

              <!-- ITEMS -->
              <ul class="mt-4 space-y-3">
                <li
                  v-for="item in order.items"
                  :key="item.id"
                  class="p-3 rounded-lg bg-gray-50 border"
                >
                  <div class="flex justify-between items-center">
                    <span class="font-medium"
                      >{{ item.quantity }}× {{ item.name }}</span
                    >
                    <span class="font-semibold"
                      >${{ getItemTotal(item).toFixed(2) }}</span
                    >
                  </div>

                  <!-- Addons -->
                  <div
                    v-for="addon in parseAddons(item.addons)"
                    :key="addon.id || addon"
                    class="text-sm text-gray-700 ml-3 mt-1"
                  >
                    <span>
                      {{
                        typeof addon === 'object'
                          ? `${addon.label || addon.name} ${
                              addon.price_cents
                                ? `($${(addon.price_cents / 100).toFixed(2)})`
                                : ''
                            }`
                          : addon
                      }}
                    </span>
                  </div>

                  <!-- Special Request -->
                  <div
                    v-if="item.specialRequest"
                    class="text-sm bg-yellow-50 border-l-4 border-yellow-400 px-3 py-1 mt-2 rounded"
                  >
                    <b>Note:</b> {{ item.specialRequest }}
                  </div>
                </li>
              </ul>

              <!-- Totals -->
              <p class="mt-4 text-sm text-gray-700">
                💵 Tip: <b>${{ ((order.tipAmount || 0) / 100).toFixed(2) }}</b>
              </p>
              <p class="font-bold text-lg text-gray-900">
                Total: ${{ ((order.totalAmount || 0) / 100).toFixed(2) }}
              </p>
            </div>
          </div>

          <p v-else class="text-gray-500 italic text-center text-lg">
            No pending orders.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Estilização básica de fundo da página do painel */
  body {
    background: #f8fafc;
  }
</style>
