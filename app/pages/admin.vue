<script setup>
// Página principal do painel admin
// - Usa useAdminAuth para lidar com login/logout
// - Usa useOrders para carregar e gerenciar pedidos
// - Controla o polling (setInterval) para atualizar pedidos periodicamente

import { ref, onMounted, onUnmounted } from 'vue'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useOrders } from '~/composables/useOrders'
import { useTimeAgo } from '~/composables/useTimeAgo'

// Extrai funções dos composables
const { timeAgo } = useTimeAgo()
const { showToast } = useToast()

// Campos de login
const email = ref('')
const password = ref('')

// Erro exibido apenas na área de login
const loginError = ref('')

// Pega estados e funções de autenticação
const { isAuthenticated, login, clearToken } = useAdminAuth()

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
    await login(email.value, password.value)
    await loadOrders()
    showToast('Login completed!', 'success')
    // Garante que o polling seja iniciado apenas uma vez
    if (!intervalId) {
      intervalId = setInterval(loadOrders, 30000)
    }
  } catch (err) {
    console.error('Login error:', err)
    loginError.value = 'Invalid credentials.'
    showToast('Fail to login', 'error')
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
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">🧾 Crêperie Panel</h1>

    <!-- 🔐 Login por e-mail e senha -->
    <div v-if="!isAuthenticated" class="mb-6 space-y-3">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="border px-3 py-2 rounded w-full"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="border px-3 py-2 rounded w-full"
      />
      <button
        @click="handleLogin"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
      >
        Login
      </button>

      <!-- Mensagem de erro apenas para problemas de login -->
      <p v-if="loginError" class="text-red-600 text-center">
        {{ loginError }}
      </p>
    </div>

    <!-- ✅ Painel Admin -->
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold">Pending Orders</h2>
        <div class="flex gap-3">
          <button
            @click="refreshMenu"
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            🔁 Update Menu
          </button>
          <button
            @click="logout"
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <!-- ⚠️ Mensagem de erro relacionada a pedidos / sessão expirada -->
      <p v-if="error" class="text-red-600 mb-4">
        {{ error }}
      </p>

      <!-- ⏳ Loading -->
      <p v-if="loading">Loading orders...</p>

      <!-- 📦 Lista de pedidos -->
      <div v-else>
        <div v-if="orders.length" class="grid gap-4">
          <div
            v-for="order in orders"
            :key="order.id"
            class="border rounded-lg p-4 shadow-sm bg-white"
            :class="{
              // Fundo levemente verde para pedidos muito recentes (últimos 5 minutos)
              'bg-green-50':
                Date.now() - new Date(order.createdAt).getTime() <
                5 * 60 * 1000,
            }"
          >
            <div class="flex justify-between items-center">
              <h2 class="font-semibold text-lg">
                Order #{{ order.dailyNumber }} — {{ order.email }}
              </h2>

              <button
                @click="markDone(order.id)"
                class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
              >
                ✅ Done
              </button>
            </div>

            <p class="text-gray-500 text-sm">
              Created at: {{ new Date(order.createdAt).toLocaleString() }}
            </p>

            <p class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
              {{ timeAgo(order.createdAt) }}
            </p>


            <ul class="mt-3 border-t pt-3 text-gray-700">
              <li
                v-for="item in order.items"
                :key="item.id"
                class="flex flex-col border-b py-2"
              >
                <!-- Linha principal com nome e preço -->
                <div class="flex justify-between items-center">
                  <span>{{ item.quantity }}x {{ item.name }}</span>
                  <span>
                    ${{ getItemTotal(item).toFixed(2) }}
                  </span>
                </div>

                <!-- Lista de toppings, se existirem -->
                <p
                  v-for="addon in parseAddons(item.addons)"
                  :key="addon.id || addon"
                  class="text-sm ml-4 text-gray-700"
                >
                  +
                  {{
                    typeof addon === 'object'
                      ? `${addon.label || addon.name || addon.id} ${
                          addon.price_cents
                            ? `($${(addon.price_cents / 100).toFixed(2)})`
                            : ''
                        }`
                      : addon
                  }}
                </p>
              </li>
            </ul>

            <p class="mt-2 font-semibold">
              Tip: ${{ ((order.tipAmount || 0) / 100).toFixed(2) }}
            </p>
            <p class="mt-2 font-semibold">
              Total: ${{ ((order.totalAmount || 0) / 100).toFixed(2) }}
            </p>
          </div>
        </div>

        <!-- 💤 Caso não tenha pedidos -->
        <p v-else class="text-gray-500 italic">
          No pending orders.
        </p>
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
