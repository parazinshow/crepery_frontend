<script setup>
  import {onMounted, ref, computed, watch, nextTick} from 'vue'
  import {useToast} from '~/composables/useToast'

  /* --------------------------------------------------------
    ESTADOS REATIVOS
  ----------------------------------------------------------- */

  // Campos do formulário e controle de interface
  const email = ref('') // e-mail do cliente
  const cart = ref([]) // itens do carrinho
  const message = ref('') // mensagens de status (erro/sucesso)
  const messageClass = ref('') // classe de cor dinâmica para mensagens
  const loading = ref(false) // estado de carregamento durante o pagamento
  const taxRate = ref(0) // porcentagem de tax aplicada
  const tipType = ref(null) // "15", "18", "20", "custom"
  const tipCustom = ref('') // valor custom (em dólares)
  const customTipMode = ref('amount') // 'amount' (valor em $) ou 'percent' (valor em %)
  const pickupTime = ref('') // horário escolhido pelo cliente ("HH:MM")
  const pickupSlots = ref([]) // lista de horários disponíveis
  const minPickupMinutes = ref(null) // só pra mostrar texto tipo "mínimo 15 min"
  const storeClosed = ref(false) // indica se a loja está fechada

  // Referências para elementos HTML e instâncias Square
  const cardContainer = ref(null) // container do input de cartão
  const appleAvailable = ref(false) // Apple Pay disponível?
  const googleAvailable = ref(false) // Google Pay disponível?
  let cardInstance = null // instância do cartão Square
  let applePay = null // instância Apple Pay
  let googlePay = null // instância Google Pay
  const paymentSuccess = ref(false) // estado de pagamento bem-sucedido

  // instancia o toast
  const {showToast} = useToast()

  /* --------------------------------------------------------
    TOTAL EM CENTAVOS
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
      const raw = parseFloat(tipCustom.value || '0')
      if (isNaN(raw) || raw <= 0) return 0

      // Valor fixo em dólares
      if (customTipMode.value === 'amount') {
        return Math.round(raw * 100)
      }

      // Valor em porcentagem
      return Math.round(subtotal.value * (raw / 100))
    }

    // Tip percentual fixa (ex: 15, 18, 20)
    const percent = Number(tipType.value)
    if (!percent || percent <= 0) return 0
    return Math.round(subtotal.value * (percent / 100))
  })

  // subtotal sem tax
  const subtotal = computed(() => total.value)

  // valor da tax em centavos
  const taxAmount = computed(() =>
    Math.round(subtotal.value * (taxRate.value / 100))
  )

  // total final (subtotal + tax + tip)
  const totalWithTax = computed(
    () => subtotal.value + taxAmount.value + tipAmountCents.value
  )

  /* --------------------------------------------------------
  Funções auxiliares para seleção de gorjeta
----------------------------------------------------------- */
  const toggleTipPercentage = (p) => {
    const value = String(p)
    // Se já estiver selecionado, volta para o default (0)
    if (tipType.value === value) {
      tipType.value = null
    } else {
      tipType.value = value
    }
    // Sempre limpa custom quando usa botões fixos
    tipCustom.value = ''
  }

  const toggleCustomTip = () => {
    if (tipType.value === 'custom') {
      // Clicou de novo em "Custom" → volta pro default (0)
      tipType.value = null
      tipCustom.value = ''
    } else {
      tipType.value = 'custom'
      // Sempre que entrar em custom, começa como valor em dólares
      customTipMode.value = 'amount'
    }
  }

  /* --------------------------------------------------------
    onMounted — Inicializa carrinho e Square Payments
  ----------------------------------------------------------- */
  onMounted(async () => {
    console.log("===== PUBLIC CONFIG =====", useRuntimeConfig().public)
    // Recupera carrinho salvo no navegador
    const savedCart = localStorage.getItem('crepegirl_cart')
    let loaded = savedCart ? JSON.parse(savedCart) : []

    //  Recupera tax salva no localStorage (ou usa padrão de 9.4%)
    const savedTax = localStorage.getItem('crepegirl_tax_percentage')
    taxRate.value = savedTax ? Number(savedTax) : 9.4

    //  Limpeza automática de dados inválidos (proteção extra)
    loaded = loaded.filter(
      (i) =>
        i?.name &&
        (i.price_cents || i.variations?.[0]?.price_cents) &&
        i.quantity > 0 &&
        !isNaN(i.quantity)
    )
    cart.value = loaded

    // Carrega horários de retirada disponíveis
    await loadPickupSlots()

    // 🔹 Configuração do ambiente e chaves públicas da Square
    const config = useRuntimeConfig()

    // NUNCA use process.env no frontend — sempre runtimeConfig.public
    const isProd = config.public.SQUARE_ENV === 'production'

    const appId = isProd
      ? config.public.SQUARE_PRODUCTION_APP_ID
      : config.public.SQUARE_SANDBOX_APP_ID

    const locationId = isProd
      ? config.public.SQUARE_PRODUCTION_LOCATION_ID
      : config.public.SQUARE_SANDBOX_LOCATION_ID

    // Verifica se o SDK da Square foi carregado no navegador
    if (!window.Square) {
      showToast('Square SDK failed to load.', 'error')
      return
    }

    /*  Inicializa métodos de pagamento */
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

  // ================================================================
  // 🔁 Recarrega horários de pickup sempre que o carrinho mudar
  // ================================================================
  watch(
    cart,
    () => {
      // evite loop: se carrinho está vazio, já limpa e sai
      if (!cart.value.length) {
        pickupSlots.value = []
        pickupTime.value = ''
        minPickupMinutes.value = null
        return
      }

      loadPickupSlots()
    },
    {deep: true}
  )

  // Calcula o preço total dos addons de um item do carrinho
  function getAddonsPriceCents(cartItem) {
    if (!cartItem.addons?.length) return 0
    return cartItem.addons.reduce(
      (sum, addon) => sum + (addon.price_cents || 0),
      0
    )
  }

  // Carrega horários de retirada disponíveis
  async function loadPickupSlots() {
    if (!cart.value.length) {
      pickupSlots.value = []
      pickupTime.value = ''
      minPickupMinutes.value = null
      return
    }

    try {
      const res = await $fetch('/api/order/pickup-slots', {
        method: 'POST',
        body: {
          // Backend só precisa de quantity
          items: cart.value.map((i) => ({
            quantity: i.quantity,
          })),
        },
      })

      // SE A LOJA ESTIVER FECHADA
      if (res.closed) {
        storeClosed.value = true
        return
      }

      storeClosed.value = false
      pickupSlots.value = res.slots || []
      minPickupMinutes.value = res.minPickupMinutes ?? null

      // se ainda não escolheu nada, seta o primeiro como padrão
      if (!pickupTime.value && pickupSlots.value.length) {
        pickupTime.value = pickupSlots.value[0]
      }
    } catch (err) {
      console.error('Failed to load pickup slots', err)
    }
  }

  /* --------------------------------------------------------
    Validação de e-mail
  ----------------------------------------------------------- */
  function validateEmail() {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    if (!email.value || !emailRegex.test(email.value)) {
      showToast('Please enter a valid email address.', 'error')
      return false
    }
    return true
  }

  /* --------------------------------------------------------
    Limpar carrinho manualmente
  ----------------------------------------------------------- */
  function clearCart() {
    if (confirm('Are you sure you want to clean the cart?')) {
      localStorage.removeItem('crepegirl_cart')
      cart.value = []
      showToast('Cart cleaned successfully.', 'success')
    }
  }

  /* --------------------------------------------------------
    Fluxo dos métodos de pagamento
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
    Envio dos dados ao backend (token + itens)
  ----------------------------------------------------------- */

  /**
   * Função central do checkout:
   * - Recebe o token do pagamento (sourceId)
   * - Envia os dados ao backend (/api/checkout)
   * - Backend valida valores e cria o pagamento real na Square
   */
  async function tokenizeAndPay(result) {
    if (result.status !== 'OK') {
      showToast('Payment validation failed.', 'error')
      return
    }

    // bloqueia pedido se a loja estiver fechada
    if (storeClosed.value) {
      showToast(
        'We are currently closed. Pickup is only available Wed–Sun, 8:30am to 4:30pm.',
        'error'
      )
      return
    }
    // 🕒 exige que tenha um pickupTime válido
    if (!pickupTime.value) {
      showToast('Please select a pickup time.', 'error')
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
          pickupTime: pickupTime.value,
          items: cart.value.map((i) => ({
            id: i.id,
            variationId: i.variationId,
            lineId: i.lineId,
            quantity: i.quantity,
            addons: i.addons?.map((a) => a.id) || [],
            special_request: i.special_request || null,
          })),
        },
      })

      // Se tudo deu certo
      if (response.success && response.payment?.status === 'COMPLETED') {
        showToast('Check your email for confirmation.', 'info')
        // mostra mensagem de pagamento bem-sucedido
        paymentSuccess.value = true
        setTimeout(() => (paymentSuccess.value = false), 2000)
        // Limpa carrinho e redireciona
        localStorage.removeItem('crepegirl_cart')
        setTimeout(() => {
          navigateTo(`/order/${response.payment.id}`)
        }, 1800)
      } else {
        const msg =
          response.statusMessage || // erros enviados com createError()
          response.message || // mensagens normais
          'Payment not authorized.'

        showToast(msg, 'error')
      }
    } catch (err) {
      // Aqui trata createError do backend
      const msg =
        err?.data?.statusMessage || // Nuxt 3 devolve assim
        err?.data?.message || // fallback
        err?.statusMessage || // outro formato possível
        'An unexpected error occurred.'

      showToast(msg, 'error')
    }
  }

  /* --------------------------------------------------------
    Voltar ao menu
  ----------------------------------------------------------- */
  function goBack() {
    navigateTo('/order')
  }
</script>

<template>
  <HeaderNav />
  <ClientOnly>
    <!-- MAIN CONTENT -->
    <section class="background w-full min-h-[calc(100vh-180px)]">
      <div class="flex flex-col max-w-7xl mx-auto p-6 gap-6 items-center">
        <h1 class="page-title text-5xl lg:text-7xl text-center">Checkout</h1>
        <!-- GRID PRINCIPAL: ESQUERDA MENU / DIREITA CARRINHO -->
        <div
          v-if="!storeClosed && cart.length"
          class="grid grid-cols-1 lg:grid-cols-12 items-start page-body"
        >
          <!-- GRID ESQUERDA -->
          <div class="lg:col-span-6 lg:px-4 lg:py-2">
            <!-- RESUMO DO CARRINHO -->
            <div class="grid grid-cols-3 pb-2">
              <div class="col-span-1">
                <button
                  @click="goBack()"
                  v-if="cart.length"
                  class="tooltip-button p-2"
                  title="Go Back"
                >
                  ← <span class="ml-2">Back to Order</span>
                </button>
              </div>
              <div>
                <h3 class="col-span-1 text-2xl font-bold mb-2 text-center">
                  Your cart
                </h3>
              </div>
              <div class="col-span-1 text-right"></div>
            </div>

            <!-- CART ITEMS -->
            <div v-if="cart.length" class="divide-y divide-primary-300">
              <div
                v-for="item in cart"
                :key="item.id"
                class="py-2 flex justify-between items-center gap-1"
              >
                <div>
                  <p class="text-xl">
                    <span>{{ item.quantity }} x {{ item.name }}</span>
                    <!-- Individual price -->
                    <span>
                      (${{
                        (
                          (item.price_cents ||
                            item.variations?.[0]?.price_cents) / 100
                        ).toFixed(2)
                      }})
                    </span>
                  </p>
                  <!-- Preco dos addons -->
                  <span class="text-base text-primary-500">
                    <div
                      v-for="addon in item.addons"
                      :key="addon.id"
                      class="ml-5"
                    >
                      <p>
                        {{ addon.label }} (${{
                          ((addon.price_cents || 0) / 100).toFixed(2)
                        }})
                      </p>
                    </div>
                    <p v-if="item.special_request" class="ml-5">
                        <b>Special request:</b> {{ item.special_request }}
                      </p>
                  </span>
                </div>

                <!-- Preco total dos itens similares -->
                <p class="font-semibold">
                  ${{
                    (
                      ((item.price_cents + getAddonsPriceCents(item) ||
                        item.variations?.[0]?.price_cents +
                          getAddonsPriceCents(item)) *
                        item.quantity) /
                      100
                    ).toFixed(2)
                  }}
                </p>
              </div>
            </div>

            <div v-if="cart.length" class="text-center">
              {{ cart.length }} items
            </div>
          </div>

          <!-- DIVIDER -->
          <div
            class="hidden lg:block col-span-1 h-full flex justify-center w-px bg-primary-300 mx-auto"
          ></div>

          <!-- GRID DIREITA -->
          <div
            class="flex flex-col mt-10 pt-4 border-t border-primary-300 lg:border-none lg:m-0 lg:col-span-5 lg:px-4 lg:py-2"
          >
            <!-- Tip Selection -->
            <div class="space-y-1 mb-6">
              <p class="text-sm">Add a Tip</p>

              <!-- Tip buttons -->
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="p in [15, 18, 20]"
                  :key="p"
                  type="button"
                  @click="toggleTipPercentage(p)"
                  :class="[
                    'tip-button ',
                    tipType === String(p)
                      ? '!bg-primary-800 !text-white'
                      : 'bg-transparent',
                  ]"
                >
                  {{ p }}%
                </button>

                <!-- Custom button -->
                <button
                  type="button"
                  @click="toggleCustomTip()"
                  :class="[
                    'tip-button',
                    tipType === 'custom'
                      ? '!bg-primary-800 !text-white'
                      : 'bg-transparent',
                  ]"
                >
                  Custom
                </button>
              </div>

              <!-- Custom tip input -->
              <div v-if="tipType === 'custom'" class="mt-2">
                <div class="flex items-center gap-2">
                  <!-- Toggle between $ and % -->
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="customTipMode = 'amount'"
                      :class="[
                        'tip-button px-4',
                        customTipMode === 'amount'
                          ? '!bg-primary-800 !text-white'
                          : 'bg-transparent',
                      ]"
                    >
                      $
                    </button>

                    <button
                      type="button"
                      @click="customTipMode = 'percent'"
                      :class="[
                        'tip-button px-4',
                        customTipMode === 'percent'
                          ? '!bg-primary-800 !text-white'
                          : 'bg-transparent',
                      ]"
                    >
                      %
                    </button>
                  </div>

                  <!-- Input -->
                  <input
                    v-model="tipCustom"
                    type="number"
                    min="0"
                    step="1"
                    :placeholder="
                      customTipMode === 'amount'
                        ? 'Enter amount (e.g. 3.00)'
                        : 'Enter percentage (e.g. 12.5)'
                    "
                    class="flex-1 border border-gray-300 p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div class="text-2xl space-y-2">
              <div class="flex justify-between">
                <span>Subtotal:</span>
                <span
                  ><b>${{ (subtotal / 100).toFixed(2) }}</b></span
                >
              </div>

              <div class="flex justify-between">
                <span>Tax ({{ taxRate.toFixed(2) }}%):</span>
                <span
                  ><b>${{ (taxAmount / 100).toFixed(2) }}</b></span
                >
              </div>

              <div class="flex justify-between">
                <span>Tip:</span>
                <b>
                  <span v-if="tipAmountCents"
                    >${{ (tipAmountCents / 100).toFixed(2) }}</span
                  >
                  <span v-else>None</span>
                </b>
              </div>

              <div class="flex justify-between border-t border-primary-500">
                <span>Total:</span>
                <span
                  ><b>${{ (totalWithTax / 100).toFixed(2) }}</b></span
                >
              </div>
            </div>
            <div class="my-6">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Pickup time
              </label>

              <select
                v-model="pickupTime"
                class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select a pickup time</option>
                <option v-for="slot in pickupSlots" :key="slot" :value="slot">
                  {{ slot }}
                </option>
              </select>

              <p
                v-if="minPickupMinutes !== null"
                class="text-xs text-gray-500 mt-1"
              >
                Minimum pickup time: {{ minPickupMinutes }} minutes from now
                (may increase if the kitchen is busy).
              </p>
            </div>

            <!-- Campo de email -->
            <div class="mb-6">
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-1"
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
            <div>
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
                class="mt-6 py-1 w-full default-button disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loading || !email"
                @click="handlePay"
              >
                {{ loading ? 'Processing...' : 'Pay' }}
              </button>
            </div>
          </div>
        </div>
        <div
          v-else-if="storeClosed"
          class="page-body flex flex-col justify-center text-center"
        >
          <span>Our store is closed.</span><span>Try again another time.</span>
        </div>
        <div v-else class="page-body flex flex-col justify-center text-center">
          <span>Empty cart.</span><span>No items to checkout.</span>
        </div>
      </div>
    </section>
  </ClientOnly>

  <Footer />
</template>

<style>
  .tip-button {
    @apply py-0.5 font-garamond font-semibold rounded-lg border border-primary-300 text-primary-800 hover:bg-primary-300;
  }
</style>
