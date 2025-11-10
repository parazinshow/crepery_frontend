<template>
  <HeaderNav />

  <!-- Evita SSR/CSR mismatch enquanto os dados chegam -->
  <client-only>
    <section class="bg-primary-50 w-full min-h-[calc(100vh-100px)]">
      <div class="max-w-7xl mx-auto p-6">
        <h1 class="text-4xl font-bold mb-6 text-center">MENU</h1>

        <!-- GRID PRINCIPAL -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <!-- ESQUERDA: MENU -->
          <div class="lg:col-span-3 bg-white shadow-lg rounded-lg px-8 py-4">
            <div v-if="loading" class="text-center text-gray-500 py-10">
              Loading menu...
            </div>

            <div v-else class="divide-y">
              <div
                v-for="item in menuFlat"
                :key="item.id"
                class="py-4 flex items-center gap-4"
              >
                <img
                  :src="item.image_url || placeholder"
                  alt=""
                  class="w-32 h-32 rounded-lg object-cover bg-gray-100"
                />
                <div class="flex-1">
                  <h3 class="text-2xl font-bold">{{ item.name }}</h3>
                  <p class="text-base text-gray-600">
                    {{ item.description || ' ' }}
                  </p>

                  <p v-if="item.variations?.[0]" class="font-bold mt-1">
                    ${{ (Number(item.variations[0].price_cents || 0) / 100).toFixed(2) }}
                  </p>
                  <p v-else class="text-gray-400 text-sm">Price unavailable</p>
                </div>

                <div class="flex items-center">
                  <button
                    @click="openCustomizationForNew(item)"
                    class="bg-primary-600 hover:bg-primary-800 text-lg text-white font-semibold px-5 py-2 rounded-lg"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- DIREITA: CARRINHO -->
          <div class="lg:col-span-2 bg-white shadow-lg rounded-lg p-8 flex flex-col">
            <h3 class="text-2xl font-bold mb-4 text-center">Your cart</h3>

            <p v-if="!loading && cart.length === 0" class="text-gray-500 text-base text-center">
              Your cart is empty.
            </p>

            <div v-else class="flex-1 space-y-3 overflow-y-auto">
              <div
                v-for="cartItem in cart"
                :key="cartItem.lineId"
                class="border rounded-md p-3 flex flex-col gap-2"
              >
                <div class="flex justify-between items-start">
                  <p class="text-xl font-semibold">{{ cartItem.name }}</p>
                  <p class="text-xl font-semibold">
                    ${{ (((cartItem.price_cents || 0) + getAddonsPriceCents(cartItem)) / 100).toFixed(2) }}
                  </p>
                </div>

                <div class="mx-4">
                  <ul
                    v-if="cartItem.addons && cartItem.addons.length"
                    class="text-md text-gray-500 space-y-0.5"
                  >
                    <li v-for="id in cartItem.addons" :key="id">
                      {{ getAddonById(id)?.label }}
                      <span class="text-gray-500 ml-4">
                        +${{ ((getAddonById(id)?.price_cents || 0) / 100).toFixed(2) }}
                      </span>
                    </li>
                  </ul>
                  <p v-else class="text-xs text-gray-400">No add-ons</p>
                </div>

                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <button
                    @click="removeFromCartByCartItem(cartItem)"
                    class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
                    title="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18 12H6" />
                    </svg>
                  </button>

                  <span class="text-md">{{ cartItem.quantity }}</span>

                  <button
                    @click="addFromCartItem(cartItem)"
                    class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
                    title="Add"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
                    </svg>
                  </button>

                  <button
                    @click="openCustomizationForExisting(cartItem)"
                    class="bg-primary-600 hover:bg-primary-800 text-white px-3 py-1 rounded-lg text-md"
                  >
                    Customize
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!loading" class="mt-4 items-center pt-3 border-t">
              <div v-if="cart.length !== 0" class="text-center text-md text-gray-500">
                <span>{{ cart.length }} item(s) in total</span>
              </div>
              <div class="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${{ (total / 100).toFixed(2) }}</span>
              </div>
            </div>

            <button
              v-if="!loading"
              @click="goToCheckout"
              :disabled="cart.length === 0"
              class="w-full mt-4 bg-primary-600 hover:bg-primary-800 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL -->
      <div
        v-if="showCustomizationModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <h3 class="text-xl font-semibold mb-2 text-center">Customize</h3>
          <p class="text-sm text-gray-600 mb-4 text-center">
            Customize your treat with our delicious add-ons.
          </p>

          <div class="space-y-4 mb-4">
            <div class="space-y-1">
              <label
                v-for="addon in addonsOptions"
                :key="addon.id"
                class="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  :value="addon.id"
                  v-model="selectedAddons"
                  class="rounded-lg border-gray-300"
                />
                <span>
                  {{ addon.label }}
                  (+${{ (addon.price_cents / 100).toFixed(2) }})
                </span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="closeCustomization"
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              @click="confirmCustomization"
              class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-800 text-white text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </section>
  </client-only>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

/* ======================================================
 🧠 STATE PRINCIPAL — VARIÁVEIS REATIVAS DE CONTROLE
------------------------------------------------------ */

// Imagem transparente usada como fallback em casos sem imagem
const placeholder =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' // 1x1 transparente

// Estrutura do menu completa separada por categorias
  const menuSections = ref({
  sweetItems: [],     // crepes doces
  savoryItems: [],    // crepes salgados
  drinks: [],         // bebidas
  toppingsSweet: [],  // toppings de doces
  toppingsSavory: [], // toppings de salgados
})
// "menuFlat" é um array plano com todos os itens principais (sem toppings)
const menuFlat = computed(() => [
  ...menuSections.value.sweetItems,
  ...menuSections.value.savoryItems,
  ...menuSections.value.drinks,
])
// Estado do carrinho
const cart = ref([])
// Indicador de carregamento (exibe “Loading...” até o menu ser carregado)
const loading = ref(true)

/* ======================================================
 🍓 ADDONS — ITENS OPCIONAIS (vêm do cache da Square)
------------------------------------------------------ */
// addonsOptions é preenchido dinamicamente com toppings do cache
const addonsOptions = ref([])

// Controle do modal de customização
const showCustomizationModal = ref(false)
const selectedItemForCustomization = ref(null)     // item do menu sendo customizado
const selectedCartItemForCustomization = ref(null) // item já existente no carrinho
const selectedAddons = ref([])                     // lista de addons selecionados

/* ======================================================
 ⚙️ HELPERS — FUNÇÕES DE APOIO
------------------------------------------------------ */
// Normaliza um array de addons, garantindo ordenação estável
function normalizeAddons(addons) {
  return [...addons].sort()
}

// Compara dois arrays de addons para saber se são equivalentes
function addonsEqual(a, b) {
  const aa = normalizeAddons(a || [])
  const bb = normalizeAddons(b || [])
  if (aa.length !== bb.length) return false
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false
  return true
}

// Busca um addon pelo seu ID (usado para exibir nome e preço)
function getAddonById(id) {
  return addonsOptions.value.find((a) => a.id === id) || null
}

// Soma o preço total dos addons de um item no carrinho
function getAddonsPriceCents(cartItem) {
  if (!cartItem.addons?.length) return 0
  return cartItem.addons.reduce(
    (sum, id) => sum + (getAddonById(id)?.price_cents || 0),
    0
  )
}

// Calcula o preço total de um item (base + addons) em centavos
function getItemTotalCents(cartItem) {
  const base = Number(cartItem.price_cents || 0)
  const addonsTotal = getAddonsPriceCents(cartItem)
  return (base + addonsTotal) * Number(cartItem.quantity || 1)
}

/* ======================================================
 🍽️ FETCH MENU (CLIENTE)
------------------------------------------------------ */
// Executa ao montar o componente — busca menu + carrega carrinho
onMounted(async () => {
  try {
    // Busca o menu atualizado no backend
    const res = await $fetch('/api/order/menu')
    // Lê categorias com fallback em caso de estrutura diferente
    const categories = res?.categories || res?.data?.categories || {}
    // Popula o estado do menu
    menuSections.value = {
      sweetItems: categories.sweetItems || [],
      savoryItems: categories.savoryItems || [],
      drinks: categories.drinks || [],
      toppingsSweet: categories.toppingsSweet || [],
      toppingsSavory: categories.toppingsSavory || [],
    }

    // Salva a porcentagem de taxa (tax) no localStorage para o checkout
    if (res?.tax != null) {
      localStorage.setItem('crepegirl_tax_percentage', String(res.tax.percentage))
    }

    // Gera dinamicamente os addons (toppings) a partir do menu
    const toppings = [
      ...(categories.toppingsSweet || []),
      ...(categories.toppingsSavory || []),
    ]
    addonsOptions.value = toppings.map((t) => ({
      id: t.id,
      label: t.name,
      price_cents: t.variations?.[0]?.price_cents || 0,
    }))
  } catch (e) {
    console.error('Erro ao carregar menu:', e)
  } finally {
    loading.value = false
  }

  // 🔁 Restaura carrinho salvo anteriormente no navegador
  const savedCart = localStorage.getItem('crepegirl_cart')
  if (savedCart) {
    const parsed = JSON.parse(savedCart)
    cart.value = parsed.map((item, index) => ({
      ...item,
      price_cents: Number(item.price_cents || 0),
      quantity: Number(item.quantity || 1),
      addons: item.addons ? normalizeAddons(item.addons) : [],
      lineId: item.lineId || `${item.variationId}-${index}`,
    }))
  }
})

/* ======================================================
 🛒 OPERAÇÕES DO CARRINHO
------------------------------------------------------ */
// Adiciona um novo item (ou aumenta quantidade se já existir)
function addToCart(item, addons = []) {
  const variation = item.variations?.[0]
  if (!variation || variation.price_cents == null) return

  const normalizedAddons = normalizeAddons(addons)
  const found = cart.value.find(
    (i) =>
      i.variationId === variation.id &&
      addonsEqual(i.addons || [], normalizedAddons)
  )

  // Se o item já existe com as mesmas customizações, só aumenta a quantidade
  if (found) {
    found.quantity = Number(found.quantity || 1) + 1
  } else {
    // Gera um ID único para o item no carrinho
    const lineId = crypto?.randomUUID
      ? crypto.randomUUID()
      : `${variation.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`
    // Adiciona ao carrinho
    cart.value.push({
      lineId,
      id: item.id,
      variationId: variation.id,
      name: item.name,
      price_cents: Number(variation.price_cents || 0),
      quantity: 1,
      image_url: item.image_url,
      addons: normalizedAddons,
    })
  }
}

// Remove 1 unidade de um item, ou remove totalmente se for o último
function removeFromCartByCartItem(cartItem) {
  const idx = cart.value.findIndex((i) => i.lineId === cartItem.lineId)
  if (idx === -1) return
  if (cart.value[idx].quantity > 1) cart.value[idx].quantity--
  else cart.value.splice(idx, 1)
}

// Aumenta a quantidade de um item diretamente pelo carrinho
function addFromCartItem(cartItem) {
  cartItem.quantity++
}

/* ======================================================
 💵 TOTAL GERAL DO CARRINHO
------------------------------------------------------ */
// Soma o total de todos os itens + addons
const total = computed(() =>
  cart.value.reduce((acc, item) => acc + getItemTotalCents(item), 0)
)

/* ======================================================
 💾 SINCRONIZAÇÃO AUTOMÁTICA DO CARRINHO
------------------------------------------------------ */
// Salva o carrinho no localStorage sempre que houver alteração
watch(
  cart,
  (val) => {
    localStorage.setItem('crepegirl_cart', JSON.stringify(val))
  },
  { deep: true }
)

/* ======================================================
 🧾 NAVEGAÇÃO — AVANÇAR PARA O CHECKOUT
------------------------------------------------------ */
function goToCheckout() {
  navigateTo('/order/checkout')
}

/* ======================================================
 🎛️ MODAL DE CUSTOMIZAÇÃO
------------------------------------------------------ */
// Abre o modal de customização ao adicionar um novo item
function openCustomizationForNew(item) {
  selectedItemForCustomization.value = item
  selectedCartItemForCustomization.value = null
  selectedAddons.value = []
  showCustomizationModal.value = true
}

// Abre o modal para editar um item já existente no carrinho
function openCustomizationForExisting(cartItem) {
  selectedCartItemForCustomization.value = cartItem
  selectedItemForCustomization.value =
    menuFlat.value.find((i) => i.id === cartItem.id) || null
  selectedAddons.value = cartItem.addons ? [...cartItem.addons] : []
  showCustomizationModal.value = true
}

// Fecha o modal e reseta os estados de customização
function closeCustomization() {
  showCustomizationModal.value = false
  selectedItemForCustomization.value = null
  selectedCartItemForCustomization.value = null
  selectedAddons.value = []
}

// Confirma as customizações feitas e atualiza ou adiciona o item
function confirmCustomization() {
  const normalized = normalizeAddons(selectedAddons.value)
  if (selectedCartItemForCustomization.value) {
    selectedCartItemForCustomization.value.addons = normalized
  } else if (selectedItemForCustomization.value) {
    addToCart(selectedItemForCustomization.value, normalized)
  }
  closeCustomization()
}
</script>


<style>
body { background-color: #f9fafb; }
</style>
