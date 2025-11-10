<script setup>
import { ref, onMounted } from 'vue'

const email = ref('')
const password = ref('')
const token = ref('')
const orders = ref([])
const loading = ref(false)
const error = ref('')

if (process.client) {
  token.value = localStorage.getItem('admin_token') || ''
}

/* 🔐 Faz login com e-mail/senha e salva o JWT */
async function login() {
  error.value = ''
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    token.value = res.token
    localStorage.setItem('admin_token', token.value)
    await loadOrders()
  } catch (err) {
    console.error('Erro ao fazer login:', err)
    error.value = 'Credenciais inválidas.'
  }
}

/* ✅ Busca pedidos pendentes */
async function loadOrders() {
  if (!token.value) return
  loading.value = true
  error.value = ''

  try {
    const res = await $fetch('/api/order/orders', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    orders.value = res.orders || []
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err)
    error.value = 'Erro ao carregar pedidos.'
  } finally {
    loading.value = false
  }
}

/* ✅ Marca pedido como concluído */
async function markDone(id) {
  try {
    await $fetch(`/api/order/${id}/done`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    orders.value = orders.value.filter((o) => o.id !== id)
  } catch (err) {
    console.error('Erro ao marcar pedido como done:', err)
    alert('❌ Erro ao marcar pedido como concluído.')
  }
}

/* ✅ Atualiza cache do menu */
async function refreshMenu() {
  try {
    await $fetch('/api/order/menu?refresh=true', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    alert('✅ Menu atualizado com sucesso!')
  } catch (err) {
    console.error('Erro ao atualizar menu:', err)
    alert('❌ Erro ao atualizar menu.')
  }
}

onMounted(() => {
  if (process.client && token.value) {
    loadOrders()
    setInterval(loadOrders, 30000)
  }
})

function logout() {
  if (process.client) {
    localStorage.removeItem('admin_token')
    location.reload()
  }
}
</script>


<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">🧾 Painel da Crêperie</h1>

    <!-- 🔐 Login por e-mail e senha -->
    <div v-if="!token" class="mb-6 space-y-3">
      <input
        v-model="email"
        type="email"
        placeholder="E-mail do administrador"
        class="border px-3 py-2 rounded w-full"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Senha"
        class="border px-3 py-2 rounded w-full"
      />
      <button
        @click="login"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
      >
        Entrar
      </button>
      <p v-if="error" class="text-red-600 text-center">{{ error }}</p>
    </div>

    <!-- ✅ Painel Admin -->
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold">Pedidos Pendentes</h2>
        <div class="flex gap-3">
          <button
            @click="refreshMenu"
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            🔁 Atualizar Menu
          </button>
          <button
            @click="logout"
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Sair
          </button>
        </div>
      </div>

      <!-- ⚠️ Mensagem de erro -->
      <p v-if="error" class="text-red-600 mb-4">{{ error }}</p>

      <!-- ⏳ Loading -->
      <p v-if="loading">Carregando pedidos...</p>

      <!-- 📦 Lista de pedidos -->
      <div v-else>
        <div v-if="orders.length" class="grid gap-4">
          <div
            v-for="order in orders"
            :key="order.id"
            class="border rounded-lg p-4 shadow-sm bg-white"
            :class="{
              'bg-green-50': Date.now() - new Date(order.createdAt).getTime() < 5 * 60 * 1000,
            }"
          >
            <div class="flex justify-between items-center">
              <h2 class="font-semibold text-lg">
                Pedido #{{ order.dailyNumber }} — {{ order.email }}
              </h2>

              <button
                @click="markDone(order.id)"
                class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
              >
                ✅ Concluir
              </button>
            </div>

            <p class="text-gray-500 text-sm">
              Criado em: {{ new Date(order.createdAt).toLocaleString() }}
            </p>

            <ul class="mt-3 border-t pt-3 text-gray-700">
              <li
                v-for="item in order.items"
                :key="item.id"
                class="flex justify-between border-b py-1"
              >
                <span>{{ item.quantity }}x {{ item.name }}</span>
                <span>${{ ((item.price || 0) / 100).toFixed(2) }}</span>
              </li>
            </ul>

            <p class="mt-2 font-semibold">
              Total: ${{ ((order.totalAmount || 0) / 100).toFixed(2) }}
            </p>
          </div>
        </div>

        <!-- 💤 Caso não tenha pedidos -->
        <p v-else class="text-gray-500 italic">Nenhum pedido pendente.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
body {
  background: #f8fafc;
}
</style>
