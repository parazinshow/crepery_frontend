<template>
  <div class="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-semibold text-center">🥞 Order Confirmation</h2>

    <!-- Loading -->
    <div v-if="pending" class="text-center text-gray-500 py-10">
      Loading your order...
    </div>

    <!-- Error -->
    <div v-else-if="error || !displayOrder" class="text-center text-red-600 py-10">
      Order not found or invalid.
    </div>

    <!-- Content -->
    <div v-else class="space-y-4">
      <div class="text-center">
        <p class="text-sm text-gray-600">Thank you for your order!</p>
        <p class="mt-1">
          <b>Order #</b>
          <span class="font-mono text-gray-700">{{ displayOrder.dailyNumber }}</span>
        </p>
        <p
          class="mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold"
          :class="{
            'bg-green-100 text-green-700': displayOrder.status === 'COMPLETED',
            'bg-yellow-100 text-yellow-700': displayOrder.status === 'PENDING',
            'bg-red-100 text-red-700': displayOrder.status !== 'COMPLETED' && displayOrder.status !== 'PENDING'
          }"
        >
          {{ displayOrder.status }}
        </p>
      </div>

      <!-- Itens do pedido (se houver) -->
      <div v-if="displayOrder.items && displayOrder.items.length">
        <h3 class="text-lg font-semibold border-b pb-2 mb-2">🧾 Order Summary</h3>
        <ul>
          <li
            v-for="it in displayOrder.items"
            :key="it.id || it.name"
            class="flex justify-between py-1 border-b border-gray-100 last:border-none"
          >
            <div>
              <p>{{ it.quantity }} × {{ it.name }}</p>

              <!-- Addons formatados -->
              <div v-if="it.addons" class="ml-4 text-gray-600 text-sm">
                <p
                  v-for="addon in parseAddons(it.addons)"
                  :key="addon.id || addon"
                >
                  + {{
                    typeof addon === 'object'
                      ? `${addon.label || addon.name || addon.id} ${
                          addon.price_cents
                            ? `($${(addon.price_cents / 100).toFixed(2)})`
                            : ''
                        }`
                      : addon
                  }}
                </p>
              </div>
            </div>

            <!-- 💰 Preço com soma dos addons -->
            <p class="font-medium">
              ${{
                (
                  (
                    (it.price_cents ?? it.price ?? 0) +
                    parseAddons(it.addons).reduce(
                      (sum, a) =>
                        sum +
                        (typeof a === 'object'
                          ? a.price_cents || 0
                          : 0),
                      0
                    )
                  ) *
                  it.quantity /
                  100
                ).toFixed(2)
              }}
            </p>
          </li>
        </ul>
      </div>

      <!-- Taxes paid -->
      <div class="text-right font-semibold text-lg border-t pt-2">
        Tax: ${{ (taxPaid / 100).toFixed(2) }}
      </div>
      <!-- Totais -->
      <div class="text-right font-semibold text-lg border-t pt-2">
        Total: ${{ (displayOrder.totalCents / 100).toFixed(2) }} {{ displayOrder.currency }}
      </div>

      <!-- Método de pagamento (se vier da Square) -->
      <div v-if="displayOrder.cardBrand || displayOrder.last4" class="text-sm text-gray-700">
        <b>Payment Method:</b>
        <span v-if="displayOrder.cardBrand">{{ displayOrder.cardBrand }}</span>
        <span v-if="displayOrder.last4"> ••••{{ displayOrder.last4 }}</span>
      </div>

      <!-- Data/hora -->
      <div class="text-sm text-gray-600">
        <b>Placed on:</b> {{ placedOn }}
      </div>
      
      <!-- Recibo -->
      <div v-if="displayOrder.receiptUrl" class="text-center mt-2">
        <a
          :href="displayOrder.receiptUrl"
          target="_blank"
          class="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          View Square Receipt
        </a>
      </div>

      <!-- Voltar -->
      <div class="text-center mt-4">
        <button
          @click="navigateTo('/order')"
          class="text-blue-600 hover:underline font-medium"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/* ------------------------------------------------------------
 📍 OBTÉM O ID DO PEDIDO PELA ROTA ATUAL
--------------------------------------------------------------- */
// Exemplo: /order/cmhr50jig0000hg9kktul4m56
// → route.params.id = "cmhr50jig0000hg9kktul4m56"
const route = useRoute()

/* ------------------------------------------------------------
 🔍 REQUISIÇÃO AO BACKEND
--------------------------------------------------------------- */
// Faz a chamada para a API interna que retorna o pedido completo.
// A API `/api/order/[id].get.js` busca o pedido no banco Prisma
// (ou, se necessário, pela Square usando o squareId).
const { data, pending, error } = await useFetch(`/api/order/${route.params.id}`)

/* ------------------------------------------------------------
 🧩 NORMALIZAÇÃO DOS DADOS
--------------------------------------------------------------- */
/**
 * O backend pode retornar diferentes formatos:
 *  - Um objeto Prisma (`order`) com campos como `totalAmount`, `items`, `createdAt`
 *  - Ou, em alguns casos, o objeto completo do pagamento Square
 *
 * Esta função padroniza os dados para que o template da UI
 * sempre tenha o mesmo formato — independente da origem.
 */
const displayOrder = computed(() => {
  const payload = data.value
  if (!payload) return null

  // Pode vir como { success, order } (backend) ou direto (Square)
  const o = payload.order ?? payload

  /* 💰 TOTAL EM CENTAVOS
   * Usa `totalAmount` (do Prisma) ou `amount_money.amount` (Square).
   */
  const totalCents =
    o.totalAmount ??
    o.amount_money?.amount ??
    0

  /* 💵 MOEDA DO PEDIDO */
  const currency = o.currency ?? o.amount_money?.currency ?? 'USD'

  /* 🆔 IDENTIFICADORES
   * Prioriza `squareId` (do pagamento real), senão usa o `id` interno do banco.
   */
  const id = o.squareId ?? o.id

  /* 📦 STATUS DO PAGAMENTO
   * Pode vir de diferentes campos dependendo da origem dos dados.
   */
  const status =
    o.status ??
    o.card_details?.status ??
    o.payment?.status ??
    'UNKNOWN'

  /* 🧾 URL DO RECIBO */
  const receiptUrl = o.receiptUrl ?? o.receipt_url ?? null

  /* 🕒 DATA DE CRIAÇÃO */
  const createdAt = o.createdAt ?? o.created_at ?? null

  /* 🧁 ITENS DO PEDIDO
   * Quando salvo no Prisma, vem em `order.items[]`.
   * Cada item contém nome, preço e quantidade.
   */
  const items = o.items ?? []

  /* 💳 INFORMAÇÕES DO CARTÃO (se disponível via Square) */
  const cardBrand = o.card_details?.card?.card_brand ?? null
  const last4 = o.card_details?.card?.last_4 ?? null

  //Order Number
  const dailyNumber = o.dailyNumber ?? null

  // Retorna tudo padronizado para a interface
  return {
    id,
    status,
    totalCents,
    currency,
    receiptUrl,
    createdAt,
    items,
    cardBrand,
    last4,
    dailyNumber
  }
})

// 🔹 Carrega o cache de toppings via endpoint interno
const { data: cacheData } = await useFetch('/api/catalog-cache')

// 🔹 Cria um mapa rápido com nome → preço
const toppingMap = new Map()
try {
  const toppingsSweet = cacheData.value?.data?.categories?.toppingsSweet || []
  const toppingsSavory = cacheData.value?.data?.categories?.toppingsSavory || []

  for (const t of [...toppingsSweet, ...toppingsSavory]) {
    const variation = t.variations?.[0]
    toppingMap.set(t.name, variation?.price_cents || 0)
  }
} catch (e) {
  console.warn('⚠️ Falha ao mapear toppings:', e)
}

/* ------------------------------------------------------------
 🕓 FORMATAÇÃO DE DATA LEGÍVEL
--------------------------------------------------------------- */
/**
 * Gera uma string amigável com a data do pedido.
 * Se não houver data, retorna "—".
 */
const placedOn = computed(() => {
  const d = displayOrder.value?.createdAt
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
})

/* HELPERS --------------------------------------------------- */
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



/**
 * 💵 Valor pago em taxas (calculado a partir da porcentagem salva)
 * 
 * Usa a taxa armazenada no localStorage (ex: 9.4%)
 * e calcula quanto desse total corresponde à tax.
 */
const taxPaid = computed(() => {
  const order = displayOrder.value
  if (!order?.totalCents) return 0

  let savedTax = 9.4 // valor padrão
  if (process.client) {
    savedTax = Number(localStorage.getItem('crepegirl_tax_percentage') || 9.4)
  }

  const taxRate = savedTax / 100

  // calcula quanto do total corresponde à tax
  const taxAmount = order.totalCents - (order.totalCents / (1 + taxRate))

  // arredonda para centavos e garante que nunca seja negativo
  return Math.round(Math.max(taxAmount, 0))
})

</script>


<style>
body {
  background-color: #f3f4f6;
}
</style>
