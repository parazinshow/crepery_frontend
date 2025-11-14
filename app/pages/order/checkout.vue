<script setup>
  import {onMounted, ref, computed} from 'vue'
  import { useToast } from '~/composables/useToast'
  
  /* --------------------------------------------------------
   🧠 ESTADOS REATIVOS
  ----------------------------------------------------------- */

  // Campos do formulário e controle de interface
  const email = ref('') // e-mail do cliente
  const cart = ref([]) // itens do carrinho
  const message = ref('') // mensagens de status (erro/sucesso)
  const messageClass = ref('') // classe de cor dinâmica para mensagens
  const loading = ref(false) // estado de carregamento durante o pagamento
  const taxRate = ref(0) // porcentagem de tax aplicada
  const tipType = ref(null)            // "15", "18", "20", "custom"
  const tipCustom = ref('')            // valor custom (em dólares)

  // Referências para elementos HTML e instâncias Square
  const cardContainer = ref(null) // container do input de cartão
  const appleAvailable = ref(false) // Apple Pay disponível?
  const googleAvailable = ref(false) // Google Pay disponível?
  let cardInstance = null // instância do cartão Square
  let applePay = null // instância Apple Pay
  let googlePay = null // instância Google Pay
  const paymentSuccess = ref(false) // estado de pagamento bem-sucedido

  // instancia o toast
  const { showToast } = useToast()

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
        (i.price_cents + getAddonsPriceCents(i) ||
          i.variations?.[0]?.price_cents + getAddonsPriceCents(i) ||
          0) *
          i.quantity,
      0
    )
  )

  /**
   * Computed property que calcula o valor da gorjeta em centavos.
   * 
   */

  const tipAmountCents = computed(() => {
    // Se nenhuma tip foi selecionada
    if (!tipType.value) return 0

    // Custom tip digitado pelo usuário
    if (tipType.value === 'custom') {
      const dollars = parseFloat(tipCustom.value || 0)
      return Math.round(dollars * 100)
    }

    // Tip percentual (ex: 15, 18, 20)
    const percent = Number(tipType.value)
    return Math.round(subtotal.value * (percent / 100))
  })

  // subtotal sem tax
  const subtotal = computed(() => total.value)

  // valor da tax em centavos
  const taxAmount = computed(() =>
    Math.round(subtotal.value * (taxRate.value / 100))
  )

  // total final (subtotal + tax + tip)
  const totalWithTax = computed(() =>
    subtotal.value + taxAmount.value + tipAmountCents.value
  )

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
      showToast("Square SDK failed to load.", "error")
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

  function getAddonsPriceCents(cartItem) {
    if (!cartItem.addons?.length) return 0
    return cartItem.addons.reduce(
      (sum, addon) => sum + (addon.price_cents || 0),
      0
    )
  }

  /* --------------------------------------------------------
   📧 Validação de e-mail
  ----------------------------------------------------------- */
  function validateEmail() {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    if (!email.value || !emailRegex.test(email.value)) {
      showToast("Please enter a valid email address.", "error")
      return false
    }
    return true
  }

  /* --------------------------------------------------------
   🧹 Limpar carrinho manualmente
  ----------------------------------------------------------- */
  function clearCart() {
    if (confirm('Are you sure you want to clean the cart?')) {
      localStorage.removeItem('crepegirl_cart')
      cart.value = []
      showToast("Cart cleaned successfully.", "success")
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
      showToast("Payment validation failed.", "error")
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
          tipAmount: tipAmountCents.value,
          items: cart.value.map((i) => ({
            id: i.id,
            variationId: i.variationId,
            lineId: i.lineId,
            quantity: i.quantity,
            addons: i.addons?.map(a => a.id) || [],
            special_request: i.special_request || null,
          })),
        },
      })

      // Se tudo deu certo
      if (response.success && response.payment?.status === 'COMPLETED') {
        showToast("Check your email for confirmation.", "info")
        // mostra mensagem de pagamento bem-sucedido
        paymentSuccess.value = true
        setTimeout(() => paymentSuccess.value = false, 2000)
        // Limpa carrinho e redireciona
        localStorage.removeItem('crepegirl_cart')
        setTimeout(() => {
          navigateTo(`/order/${response.payment.id}`)
        }, 1800)
      } else {
        showToast(response.message || "Payment not authorized.", "error")
      }
    } catch (err) {
      console.error(err)
      showToast("Communication error with payment server.", "error")
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
    <div v-if="paymentSuccess"
     class="bg-green-600 text-white text-center py-2 font-semibold animate-fade">
      Payment successful! Redirecting...
    </div>
  <div
    class="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg space-y-6"
  >
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-semibold text-center flex-1">Checkout</h2>
      <button
        @click="goBack"
        class="text-sm text-blue-600 hover:underline font-medium"
      >
        ← Back to Menu
      </button>
    </div>

    <!-- Resumo do carrinho -->
    <div v-if="cart.length" class="divide-y divide-gray-200">
      <!-- Item do carrinho -->
      <div
        v-for="item in cart"
        :key="item.id"
        class="py-2 flex justify-between items-center"
      >
        <div>
          <p class="font-semibold">
            <span>{{ item.quantity }} x {{ item.name }}</span>
            <!-- Individual price -->
            <span class="ml-4 text-gray-500">
              (${{
                (
                  (item.price_cents || item.variations?.[0]?.price_cents) / 100
                ).toFixed(2)
              }})
            </span>
          </p>

          <!-- Preco dos addons -->
          <span class="text-sm text-gray-500">
            <div
              v-for="addon in item.addons"
              :key="addon.id"
              class="py-2 flex justify-between items-center"
            >
              <p>
                {{ addon.label }} (${{
                  ((addon.price_cents || 0) / 100).toFixed(2)
                }})
              </p>
            </div>
          </span>
        </div>

        <!-- Preco total dos itens similares -->
        <p class="font-semibold">
          ${{
            (
              ((item.price_cents + getAddonsPriceCents(item) || item.variations?.[0]?.price_cents + getAddonsPriceCents(item)) *
                item.quantity) /
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
          🧹 Empty Cart
        </button>
      </div>
    </div>

    <div class="text-center text-lg font-semibold mb-3 pt-3 space-y-1">
      <div>Subtotal: ${{ (subtotal / 100).toFixed(2) }}</div>
      <div>Tax ({{ taxRate.toFixed(2) }}%): ${{ (taxAmount / 100).toFixed(2) }}</div>
      <div>Tip: ${{ (tipAmountCents / 100).toFixed(2) }}</div>
      <div class="font-bold text-green-700">
        Total: ${{ (totalWithTax / 100).toFixed(2) }}
      </div>
    </div>

    <!-- Tip Selection -->
    <div class="space-y-3 mt-4">
      <label class="text-sm font-medium text-gray-700">Add a Tip</label>

      <!-- Tip buttons -->
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="p in [15, 18, 20]"
          :key="p"
          @click="tipType = String(p)"
          :class="[
            'py-2 rounded-lg border text-center font-medium transition',
            tipType === String(p)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          ]"
        >
          {{ p }}%
        </button>

        <!-- custom button -->
        <button
          @click="tipType = 'custom'"
          :class="[
            'py-2 rounded-lg border text-center font-medium transition',
            tipType === 'custom'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          ]"
        >
          Custom
        </button>
      </div>

      <!-- Custom tip input -->
      <div v-if="tipType === 'custom'" class="mt-2">
        <input
          v-model="tipCustom"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter amount (e.g. 3.00)"
          class="w-full border border-gray-300 p-2 rounded-lg"
        />
      </div>
    </div>

    <!-- Campo de email -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1"
        >E-mail</label
      >
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
      {{ loading ? 'Processing...' : 'Pay' }}
    </button>

    <p v-if="message" class="text-center text-sm mt-4" :class="messageClass">
      {{ message }}
    </p>
  </div>
</template>

<style>
  body {
    background-color: #f3f4f6;
  }
</style>
