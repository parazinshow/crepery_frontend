<template>
  <div class="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg space-y-6">
    <h2 class="text-2xl font-semibold text-center">Checkout</h2>

    <!-- Campo de email -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
      <input
        v-model="email"
        id="email"
        type="email"
        required
        placeholder="Enter your email"
        class="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- Apple Pay -->
    <button
      v-if="appleAvailable"
      ref="appleButton"
      class="w-full bg-black text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      @click="handleApplePay"
    >
      <span></span> Pay with Apple Pay
    </button>

    <!-- Google Pay -->
    <button
      v-if="googleAvailable"
      ref="googleButton"
      class="w-full bg-[#4285F4] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      @click="handleGooglePay"
    >
      <span class="text-lg">G</span> Pay with Google Pay
    </button>

    <!-- Campo de cartão -->
    <div v-if="!appleAvailable && !googleAvailable" ref="cardContainer" class="border border-gray-300 p-3 rounded-md"></div>

    <!-- Botão principal -->
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

<script setup>
import { onMounted, ref } from 'vue'

const email = ref('')
const message = ref('')
const messageClass = ref('')
const loading = ref(false)
const cardContainer = ref(null)
const appleAvailable = ref(false)
const googleAvailable = ref(false)
let cardInstance = null
let applePay = null
let googlePay = null

onMounted(async () => {
  const config = useRuntimeConfig()
  const isProd = process.env.NODE_ENV === 'production'

  const appId = isProd
    ? config.public.SQUARE_PRODUCTION_APP_ID
    : config.public.SQUARE_SANDBOX_APP_ID

  const locationId = isProd
    ? config.public.SQUARE_PRODUCTION_LOCATION_ID
    : config.public.SQUARE_SANDBOX_LOCATION_ID

  if (!window.Square) {
    message.value = 'Square SDK não carregou corretamente.'
    messageClass.value = 'text-red-500'
    return
  }

  try {
    const payments = await window.Square.payments(appId, locationId)

    try {
      applePay = await payments.applePay()
      appleAvailable.value = await applePay.canMakePayment()
    } catch {
      appleAvailable.value = false
    }

    try {
      googlePay = await payments.googlePay()
      googleAvailable.value = await googlePay.canMakePayment()
    } catch {
      googleAvailable.value = false
    }

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

const handleApplePay = async () => {
  if (!validateEmail()) return
  try {
    const result = await applePay.tokenize()
    if (result.status === 'OK') {
      await processPayment(result.token)
    } else {
      message.value = 'Apple Pay falhou.'
      messageClass.value = 'text-red-600'
    }
  } catch (err) {
    console.error(err)
    message.value = 'Erro ao processar Apple Pay.'
    messageClass.value = 'text-red-600'
  }
}

const handleGooglePay = async () => {
  if (!validateEmail()) return
  try {
    const result = await googlePay.tokenize()
    if (result.status === 'OK') {
      await processPayment(result.token)
    } else {
      message.value = 'Google Pay falhou.'
      messageClass.value = 'text-red-600'
    }
  } catch (err) {
    console.error(err)
    message.value = 'Erro ao processar Google Pay.'
    messageClass.value = 'text-red-600'
  }
}

const handlePay = async () => {
  if (!validateEmail()) return
  if (!cardInstance) {
    message.value = 'Erro interno: campo de cartão não carregado.'
    messageClass.value = 'text-red-500'
    return
  }

  loading.value = true
  message.value = ''
  messageClass.value = ''

  try {
    const result = await cardInstance.tokenize()
    if (result.status !== 'OK') {
      message.value = 'Falha ao validar cartão.'
      messageClass.value = 'text-red-600'
      loading.value = false
      return
    }

    await processPayment(result.token)
  } catch (err) {
    console.error(err)
    message.value = 'Erro de comunicação com o servidor.'
    messageClass.value = 'text-red-600'
  } finally {
    loading.value = false
  }
}

function validateEmail() {
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  if (!email.value || !emailRegex.test(email.value)) {
    message.value = 'Por favor, insira um e-mail válido.'
    messageClass.value = 'text-red-600'
    return false
  }
  return true
}

async function processPayment(token) {
  try {
    const response = await $fetch('/api/checkout', {
      method: 'POST',
      body: { sourceId: token, amount: 2200, email: email.value },
    })

    if (response.success && response.payment?.status === 'COMPLETED') {
      message.value = '✅ Pagamento concluído! Um e-mail de confirmação foi enviado.'
      messageClass.value = 'text-green-600'
      setTimeout(() => {
        navigateTo(`/order/${response.payment.id}`)
      }, 1500)
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
</script>

<style>
body {
  background-color: #f3f4f6;
}
</style>
