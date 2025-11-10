<script setup>
import { onMounted, ref, computed } from 'vue'

/* --------------------------------------------------------
 🧠 ESTADOS REATIVOS
----------------------------------------------------------- */

// Campos do formulário e controle de interface
const email = ref('')               // e-mail do cliente
const cart = ref([])                // itens do carrinho
const message = ref('')             // mensagens de status (erro/sucesso)
const messageClass = ref('')        // classe de cor dinâmica para mensagens
const loading = ref(false)          // estado de carregamento durante o pagamento
const taxRate = ref(0)              // porcentagem de tax aplicada

// Referências para elementos HTML e instâncias Square
const cardContainer = ref(null)     // container do input de cartão
const appleAvailable = ref(false)   // Apple Pay disponível?
const googleAvailable = ref(false)  // Google Pay disponível?
let cardInstance = null             // instância do cartão Square
let applePay = null                 // instância Apple Pay
let googlePay = null                // instância Google Pay

/* --------------------------------------------------------
 💰 TOTAL EM CENTAVOS
----------------------------------------------------------- */
/**
 * Computed property que soma os preços do carrinho.
 * Mantém o valor em centavos (inteiro) — formato que a API da Square espera.
 */
const total = computed(() =>
  cart.value.reduce(
    (acc, i) =>
      acc +
      ((i.price_cents || i.variations?.[0]?.price_cents || 0) * i.quantity),
    0
  )
)

// subtotal sem tax
const subtotal = computed(() => total.value)

// valor da tax em centavos
const taxAmount = computed(() => Math.round(subtotal.value * (taxRate.value /100)))

// total final (subtotal + tax)
const totalWithTax = computed(() => subtotal.value + taxAmount.value)

/* --------------------------------------------------------
 🚀 onMounted — Inicializa carrinho e Square Payments
----------------------------------------------------------- */
onMounted(async () => {
  // Recupera carrinho salvo no navegador
  const savedCart = localStorage.getItem('crepegirl_cart')
  let loaded = savedCart ? JSON.parse(savedCart) : []

  // 🔹 Recupera tax salva no localStorage (ou usa padrão de 9.4%)
  const savedTax = localStorage.getItem('crepegirl_tax_percentage')
  taxRate.value = savedTax ? Number(savedTax) : 9.4


  // 🔸 Limpeza automática de dados inválidos (proteção extra)
  loaded = loaded.filter(
    (i) =>
      i?.name &&
      (i.price_cents || i.variations?.[0]?.price_cents) &&
      i.quantity > 0 &&
      !isNaN(i.quantity)
  )
  cart.value = loaded

  // 🔹 Configuração do ambiente e chaves públicas da Square
  const config = useRuntimeConfig()
  const isProd = process.env.NODE_ENV === 'production'

  const appId = isProd
    ? config.public.SQUARE_PRODUCTION_APP_ID
    : config.public.SQUARE_SANDBOX_APP_ID
  const locationId = isProd
    ? config.public.SQUARE_PRODUCTION_LOCATION_ID
    : config.public.SQUARE_SANDBOX_LOCATION_ID

  // Verifica se o SDK da Square foi carregado no navegador
  if (!window.Square) {
    message.value = 'Square SDK não carregou corretamente.'
    messageClass.value = 'text-red-500'
    return
  }

  /* 🧾 Inicializa métodos de pagamento */
  try {
    // Cria objeto principal de pagamentos Square
    const payments = await window.Square.payments(appId, locationId)

    // Testa disponibilidade do Apple Pay
    try {
      applePay = await payments.applePay()
      appleAvailable.value = await applePay.canMakePayment()
    } catch {
      appleAvailable.value = false
    }

    // Testa disponibilidade do Google Pay
    try {
      googlePay = await payments.googlePay()
      googleAvailable.value = await googlePay.canMakePayment()
    } catch {
      googleAvailable.value = false
    }

    // Se nenhum wallet estiver disponível, cria formulário de cartão
    if (!appleAvailable.value && !googleAvailable.value) {
      cardInstance = await payments.card()
      await cardInstance.attach(cardContainer.value)
    }
  } catch (err) {
    console.error(err)
    message.value = 'Erro ao inicializar métodos de pagamento.'
    messageClass.value = 'text-red-500'
  }
})

/* --------------------------------------------------------
 📧 Validação de e-mail
----------------------------------------------------------- */
function validateEmail() {
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  if (!email.value || !emailRegex.test(email.value)) {
    message.value = 'Por favor, insira um e-mail válido.'
    messageClass.value = 'text-red-600'
    return false
  }
  return true
}

/* --------------------------------------------------------
 🧹 Limpar carrinho manualmente
----------------------------------------------------------- */
function clearCart() {
  if (confirm('Tem certeza que deseja limpar o carrinho?')) {
    localStorage.removeItem('crepegirl_cart')
    cart.value = []
    message.value = 'Carrinho limpo com sucesso.'
    messageClass.value = 'text-green-600'
  }
}

/* --------------------------------------------------------
 💳 Fluxo dos métodos de pagamento
----------------------------------------------------------- */

// Apple Pay
const handleApplePay = async () => {
  if (!validateEmail()) return
  await tokenizeAndPay(await applePay.tokenize())
}

// Google Pay
const handleGooglePay = async () => {
  if (!validateEmail()) return
  await tokenizeAndPay(await googlePay.tokenize())
}

// Cartão tradicional
const handlePay = async () => {
  if (!validateEmail()) return
  if (!cardInstance) {
    message.value = 'Erro interno: campo de cartão não carregado.'
    messageClass.value = 'text-red-500'
    return
  }

  loading.value = true
  try {
    // Cria o token (sourceId) com dados do cartão
    const result = await cardInstance.tokenize()
    await tokenizeAndPay(result)
  } catch (err) {
    console.error(err)
    message.value = 'Erro de comunicação com o servidor.'
    messageClass.value = 'text-red-600'
  } finally {
    loading.value = false
  }
}

/* --------------------------------------------------------
 🚀 Envio dos dados ao backend (token + itens)
----------------------------------------------------------- */

/**
 * Função central do checkout:
 * - Recebe o token do pagamento (sourceId)
 * - Envia os dados ao backend (/api/checkout)
 * - Backend valida valores e cria o pagamento real na Square
 */
async function tokenizeAndPay(result) {
  if (result.status !== 'OK') {
    message.value = 'Falha ao validar pagamento.'
    messageClass.value = 'text-red-600'
    return
  }

  try {
    // Envia ao servidor apenas IDs e quantidades
    // O preço é recalculado direto na API da Square
    const response = await $fetch('/api/order/checkout', {
      method: 'POST',
      body: {
        sourceId: result.token,
        email: email.value,
        items: cart.value.map(i => ({ id: i.id, quantity: i.quantity })),
      },
    })

    // Se tudo deu certo
    if (response.success && response.payment?.status === 'COMPLETED') {
      message.value = '✅ Pagamento concluído! Verifique seu e-mail.'
      messageClass.value = 'text-green-600'

      // Limpa carrinho e redireciona
      localStorage.removeItem('crepegirl_cart')
      setTimeout(() => navigateTo(`/order/${response.payment.id}`), 1500)
    } else {
      message.value = response.message || '❌ Pagamento não autorizado.'
      messageClass.value = 'text-red-600'
    }
  } catch (err) {
    console.error(err)
    message.value = 'Erro ao processar pagamento.'
    messageClass.value = 'text-red-600'
  }
}

/* --------------------------------------------------------
 🔙 Voltar ao menu
----------------------------------------------------------- */
function goBack() {
  navigateTo('/order')
}
</script>


<template>
  <div class="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-semibold text-center flex-1">Checkout</h2>
      <button @click="goBack" class="text-sm text-blue-600 hover:underline font-medium">
        ← Voltar ao Menu
      </button>
    </div>

    <!-- Resumo do carrinho -->
    <div v-if="cart.length" class="divide-y divide-gray-200">
      <div v-for="item in cart" :key="item.id" class="py-2 flex justify-between items-center">
        <div>
          <p class="font-semibold">{{ item.name }}</p>
          <p class="text-sm text-gray-500">
            {{ item.quantity }} × ${{
              ((item.price_cents || item.variations?.[0]?.price_cents) / 100).toFixed(2)
            }}
          </p>
        </div>
        <p class="font-semibold">
          ${{
            (
              ((item.price_cents || item.variations?.[0]?.price_cents) * item.quantity) /
              100
            ).toFixed(2)
          }}
        </p>
      </div>

      <!-- 🧹 Limpar carrinho -->
      <div class="text-right pt-3">
        <button
          @click="clearCart"
          class="text-sm text-red-600 hover:text-red-800 font-medium underline"
        >
          🧹 Limpar carrinho
        </button>
      </div>
    </div>

    <div class="text-center text-lg font-semibold mb-3 pt-3 space-y-1">
      <div>Subtotal: ${{ (subtotal / 100).toFixed(2) }}</div>
      <div>Tax ({{ (taxRate).toFixed(2) }}%): ${{ (taxAmount / 100).toFixed(2) }}</div>
      <div class="font-bold text-green-700">
        Total: ${{ (totalWithTax / 100).toFixed(2) }}
      </div>
    </div>

    <!-- Campo de email -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
      <input
        v-model="email"
        id="email"
        type="email"
        required
        placeholder="Enter your email"
        class="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- Métodos de pagamento -->
    <button
      v-if="appleAvailable"
      ref="appleButton"
      class="w-full bg-black text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      @click="handleApplePay"
    >
      <span></span> Pay with Apple Pay
    </button>

    <button
      v-if="googleAvailable"
      ref="googleButton"
      class="w-full bg-[#4285F4] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      @click="handleGooglePay"
    >
      <span class="text-lg">G</span> Pay with Google Pay
    </button>

    <div
      v-if="!appleAvailable && !googleAvailable"
      ref="cardContainer"
      class="border border-gray-300 p-3 rounded-lg"
    ></div>

    <button
      v-if="!appleAvailable && !googleAvailable"
      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading || !email"
      @click="handlePay"
    >
      {{ loading ? 'Processando...' : 'Pagar' }}
    </button>

    <p v-if="message" class="text-center text-sm mt-4" :class="messageClass">{{ message }}</p>
  </div>
</template>

<style>
body {
  background-color: #f3f4f6;
}
</style>
