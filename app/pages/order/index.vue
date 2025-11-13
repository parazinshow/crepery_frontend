<template>
  <HeaderNav />

  <!-- Evita SSR/CSR mismatch enquanto os dados chegam -->
  <client-only>
    <section class="background w-full min-h-[calc(100vh-100px)]">
      <div class="max-w-7xl mx-auto p-6">
        <h1 class="page-title text-5xl lg:text-7xl text-center">Menu</h1>

        <!-- TOP CATEGORY NAVIGATION -->
        <div class="flex flex-wrap gap-3 justify-center my-6">
          <button
            v-for="section in categorizedMenu"
            :key="section.key"
            @click="scrollToSection(section.key)"
            class="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 transition text-base"
          >
            {{ section.title }}
          </button>
        </div>

        <!-- GRID PRINCIPAL: ESQUERDA MENU / DIREITA CARRINHO -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <!-- COLUNA ESQUERDA: MENU -->
          <div class="lg:col-span-3 lg:px-4 lg:py-2">
            <!-- Estado de carregamento -->
            <div v-if="loading" class="page-body text-center py-10">Loading menu...</div>

            <!-- MENU COM SEÇÕES FIXAS -->
            <div v-else class="space-y-8">

              <!-- Cada seção -->
              <div
                v-for="section in categorizedMenu"
                :key="section.key"
                :id="'section-' + section.key"
                class="scroll-mt-24"
              >
                <!-- Título da seção -->
                <h2 class="text-4xl font-bold mb-3 text-center">
                  {{ section.title }}
                </h2>

                <!-- Lista de itens -->
                <div class="divide-y">
                  <div
                    v-for="item in section.items"
                    :key="item.id"
                    class="py-4 flex items-center gap-4"
                  >
                    <img
                      :src="item.image_url || placeholder"
                      class="w-20 h-20 rounded-lg object-contain"
                    />

                    <div class="page-body flex-1">
                      <h3 class="text-2xl font-bold">{{ item.name }}</h3>
                      <p>{{ item.description }}</p>

                      <p v-if="item.variations?.[0]" class="font-bold mt-1">
                        ${{ (item.variations[0].price_cents / 100).toFixed(2) }}
                      </p>
                    </div>

                    <button
                      @click="openCustomizationForNew(item)"
                      class="default-button h-16 w-16 lg:default-button-desktop"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- DIREITA: CARRINHO -->
          <div class="page-body lg:col-span-2 lg:px-4 lg:py-2 flex flex-col">
            <h3 class="text-2xl font-bold mb-4 text-center">Your cart</h3>

            <p
              v-if="!loading && cart.length === 0"
              class="text-base text-center"
            >
              Your cart is empty.
            </p>

            <!-- CART ITEM -->
            <div v-else class="flex-1 space-y-3 overflow-y-auto">
              <div
                v-for="cartItem in cart"
                :key="cartItem.lineId"
                class="border rounded-md p-3 flex flex-col gap-2"
              >
                <div class="flex justify-between items-start">
                  <p class="text-xl font-semibold">{{ cartItem.name }}</p>
                  <p class="text-xl font-semibold">
                    <!-- Se só tem 1 unidade, mostra o preço simples -->
                    <span v-if="cartItem.quantity === 1">
                      ${{
                        ((getItemTotalCents(cartItem) || 0) / 100).toFixed(2)
                      }}
                    </span>

                    <!-- Se tem mais de 1, mostra "N x preço" -->
                    <span v-else>
                      {{ cartItem.quantity }} x ${{
                        ((getItemTotalCents(cartItem) || 0) / 100).toFixed(2)
                      }}
                    </span>
                  </p>
                </div>

                <!-- Add-on for each cart item -->
                <div class="mx-4">
                  <ul
                    v-if="cartItem.addons && cartItem.addons.length"
                    class="text-base space-y-0.5"
                  >
                    <li v-for="addon in cartItem.addons" :key="addon.id">
                      <span class="ml-4 text-lg font-semibold">
                        + {{ addon.label }}
                      </span>
                      <span class="ml-4 text-lg font-semibold">
                        ${{ ((addon?.price_cents || 0) / 100).toFixed(2) }}
                      </span>
                    </li>
                  </ul>
                </div>

                <!-- +, - AND CUSTOMIZE BUTTONS -->
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <!-- Add button -->
                  <button
                    @click="removeFromCartByCartItem(cartItem)"
                    class="tooltip-button p-2 lg:tooltip-button-desktop"
                    title="Remove"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M18 12H6"
                      />
                    </svg>
                  </button>

                  <!-- Item quantity -->
                  <span class="text-base">{{ cartItem.quantity }}</span>

                  <!-- Remove button -->
                  <button
                    @click="addFromCartItem(cartItem)"
                    class="tooltip-button p-2 lg:tooltip-button-desktop"
                    title="Add"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6v12m6-6H6"
                      />
                    </svg>
                  </button>

                  <!-- Customize button -->
                  <button
                    v-if="itemNeedsModal(cartItem)"
                    @click="openCustomizationForExisting(cartItem)"
                    class="default-button py-1 px-4 lg:default-button-desktop"
                  >
                    Customize
                  </button>
                </div>

                <!-- Special request note -->
                <div v-if="cartItem.special_request" class="font-bold text-md mt-1">
                  <b>Special Request:</b> {{ cartItem.special_request }}
                </div>

              </div>
            </div>

            <!-- TOTAL SUMMARY -->
            <div v-if="!loading" class="mt-4 items-center pt-3 border-t">
              <!-- X itens in total -->
              <div v-if="cart.length !== 0" class="text-center text-base">
                <span>{{ cart.length }} item(s) in total</span>
              </div>

              <!-- Total amount -->
              <div class="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${{ (total / 100).toFixed(2) }}</span>
              </div>
            </div>

            <!-- CHECKOUT BUTTON -->
            <button
              v-if="!loading"
              @click="goToCheckout"
              :disabled="cart.length === 0"
              class="default-button lg:default-button-desktop w-full mt-4 py-2"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL -->
      <div
        v-if="showCustomizationModal"
        class="fixed bg-black/50 inset-0 flex items-center justify-center z-50"
      >
        <div class="modal w-3/4 max-w-md lg:w-full mx-auto my-auto p-6 max-h-[80vh] overflow-y-auto rounded-xl bg-white">
          <!-- Title and subtitle -->
          <h3 class="text-xl font-semibold mb-2 text-center">Customize</h3>
          <p class="text-sm mb-4 text-center">
            Customize your treat with our delicious add-ons.
          </p>

          <!-- Add-ons -->
          <div class="space-y-4 mb-4">
            <div class="space-y-2">
              <label
                v-for="addon in addonsOptions"
                :key="addon.id"
                class="flex items-center gap-2 text-base cursor-pointer select-none py-2 px-2 rounded-lg hover:bg-gray-100 transition"
              >
                <!-- Checkbox -->
                <input
                  type="checkbox"
                  :value="addon.id"
                  v-model="selectedAddons"
                  class="rounded-md h-5 w-5 border-gray-400"
                />

                <!-- Label + preço -->
                <span class="ml-1 flex-1">
                  {{ addon.label }}
                </span>
                <span class="text-gray-600">
                  (+${{ (addon.price_cents / 100).toFixed(2) }})
                </span>
              </label>
            </div>
          </div>

          <!-- Special Requests -->
          <div class="mt-4">
            <label class="text-base font-semibold">Special request (optional)</label>
            <textarea
              v-model="specialRequest"
              placeholder="e.g. extra hot, no onions, sauce on the side..."
              class="w-full rounded-lg border p-2 text-base resize-none mt-1"
              rows="3"
            ></textarea>
          </div>


          <!-- CANCEL AND SAVE MODAL BUTTONS -->
          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="closeCustomization"
              class="px-4 py-2 cancel-button lg:cancel-button-desktop"
            >
              Cancel
            </button>
            <button
              @click="confirmCustomization"
              class="px-4 py-2 default-button lg:default-button-desktop"
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
/**
 * ================================================================
 *  MENU PAGE — CREPERIA
 *  Versão revisada, corrigida e profissionalizada
 *  - Special request funcionando
 *  - Addons funcionando
 *  - Carrinho com persistência correta
 *  - Drinks e Soup com modal sem addons
 *  - NormalizeAddons corrigido
 *  - addToCart corrigido
 *  - Edição de itens preservada
 * ================================================================
 */

import { ref, computed, onMounted, watch } from 'vue'

// Campo do modal: Special Request
const specialRequest = ref("")

// Placeholder para itens sem imagem
const placeholder =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='


// ================================================================
//  MENU SECTIONS: Estrutura principal vinda do backend
// ================================================================
const menuSections = ref({
  sweetItems: [],
  savoryItems: [],
  drinks: [],
  croissants: [],
  onionSoup: [],
  toppingsSweet: [],
  toppingsSavory: [],
})


// ================================================================
//  menuFlat → versão linear do menu (sem toppings)
// ================================================================
const menuFlat = computed(() => [
  ...menuSections.value.sweetItems,
  ...menuSections.value.savoryItems,
  ...menuSections.value.drinks,
  ...menuSections.value.croissants,
  ...menuSections.value.onionSoup,
])


// ================================================================
//  CART
// ================================================================
const cart = ref([])
const loading = ref(true)
const addonsOptions = ref([])


// ================================================================
//  MODAL DE CUSTOMIZAÇÃO
// ================================================================
const showCustomizationModal = ref(false)
const selectedItemForCustomization = ref(null)
const selectedCartItemForCustomization = ref(null)
const selectedAddons = ref([])


// ================================================================
//  CATEGORIAS VISÍVEIS NO MENU
// ================================================================
const categorizedMenu = computed(() => [
  {
    key: 'sweet',
    title: '🥞 Sweet Crepes',
    items: menuSections.value.sweetItems,
  },
  {
    key: 'savory',
    title: '🥓 Savory Crepes',
    items: menuSections.value.savoryItems,
  },
  {
    key: 'croissants',
    title: '🥐 Croissants',
    items: menuSections.value.croissants,
  },
  {
    key: 'onionSoup',
    title: '🍲 Onion Soup',
    items: menuSections.value.onionSoup,
  },
  {
    key: 'drinks',
    title: '🥤 Drinks',
    items: menuSections.value.drinks,
  },
])


// ================================================================
// SCROLL PARA A SEÇÃO CLICADA NO TOP NAV
// ================================================================
function scrollToSection(key) {
  const el = document.getElementById('section-' + key)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}


// ================================================================
// NORMALIZAÇÃO / COMPARAÇÃO DE ADD-ONS
// ================================================================
function normalizeAddons(addons) {
  // addons recebidos aqui são IDs
  return [...addons].filter(Boolean).sort()
}

function addonsEqual(a, b) {
  const A = normalizeAddons(a)
  const B = normalizeAddons(b)
  if (A.length !== B.length) return false
  return A.every((v, i) => v === B[i])
}


// ================================================================
// Busca addon completo pelo ID
// ================================================================
function getAddonById(id) {
  return addonsOptions.value.find(a => a.id === id) || null
}


// ================================================================
// CÁLCULOS DO CARRINHO
// ================================================================
function getAddonsPriceCents(cartItem) {
  if (!cartItem.addons?.length) return 0
  return cartItem.addons.reduce(
    (sum, addon) => sum + (addon.price_cents || 0),
    0
  )
}

function getItemTotalCents(cartItem) {
  const base = Number(cartItem.price_cents || 0)
  const addonsTotal = getAddonsPriceCents(cartItem)
  return (base + addonsTotal) * Number(cartItem.quantity || 1)
}

const total = computed(() =>
  cart.value.reduce((acc, item) => acc + getItemTotalCents(item), 0)
)


// ================================================================
//  onMounted — carregar menu + restaurar carrinho
// ================================================================
onMounted(async () => {
  try {
    const res = await $fetch('/api/order/menu')
    const categories = res?.categories || {}

    menuSections.value = {
      sweetItems: (categories.sweetItems || []).map(i => ({ ...i })),
      savoryItems: (categories.savoryItems || []).map(i => ({ ...i })),
      drinks: (categories.drinks || []).map(i => ({ ...i })),
      croissants: (categories.croissants || []).map(i => ({ ...i })),
      onionSoup: (categories.onionSoup || []).map(i => ({ ...i })),
      toppingsSweet: categories.toppingsSweet || [],
      toppingsSavory: categories.toppingsSavory || [],
    }

    // Preparar lista completa de addons
    const toppings = [
      ...(categories.toppingsSweet || []),
      ...(categories.toppingsSavory || []),
    ]
    addonsOptions.value = toppings.map(t => ({
      id: t.id,
      label: t.name,
      price_cents: t.variations?.[0]?.price_cents || 0,
    }))
  } catch (e) {
    console.error('Erro ao carregar menu:', e)
  } finally {
    loading.value = false
  }

  // Restaurar carrinho
  const saved = localStorage.getItem('crepegirl_cart')
  if (saved) {
    const parsed = JSON.parse(saved)
    cart.value = parsed.map((item, index) => ({
      ...item,
      special_request: item.special_request || null,
      price_cents: Number(item.price_cents || 0),
      quantity: Number(item.quantity || 1),
      addons: Array.isArray(item.addons) ? item.addons : [],
      lineId: item.lineId || `${item.variationId}-${index}`,
    }))
  }
})


// ================================================================
// Salvar carrinho no localStorage sempre que mudar
// ================================================================
watch(
  cart,
  val => {
    localStorage.setItem('crepegirl_cart', JSON.stringify(val))
  },
  { deep: true }
)


// ================================================================
//  itemNeedsModal — decide se item abre modal
// ================================================================
function itemNeedsModal(item) {
  const { sweetItems, savoryItems, croissants } = menuSections.value

  if (sweetItems.some(i => i.id === item.id)) return true
  if (savoryItems.some(i => i.id === item.id)) return true
  if (croissants.some(i => i.id === item.id)) return true

  // Drinks e Soup abrem modal MAS sem addons → handled no modal
  return true
}


// ================================================================
// RETORNA LISTA DE ADDONS PERMITIDOS POR ITEM
// ================================================================
function getToppingsForItem(item) {
  if (!item) return []

  const {
    sweetItems,
    savoryItems,
    croissants,
    toppingsSweet,
    toppingsSavory,
  } = menuSections.value

  // Sweet → sweet toppings
  if (sweetItems.some(i => i.id === item.id)) {
    return toppingsSweet.map(t => ({
      id: t.id,
      label: t.name,
      price_cents: t.variations?.[0]?.price_cents || 0,
    }))
  }

  // Savory → savory toppings
  if (savoryItems.some(i => i.id === item.id)) {
    return toppingsSavory.map(t => ({
      id: t.id,
      label: t.name,
      price_cents: t.variations?.[0]?.price_cents || 0,
    }))
  }

  // Croissants → ambos
  if (croissants.some(i => i.id === item.id)) {
    return [
      ...toppingsSweet.map(t => ({
        id: t.id,
        label: t.name,
        price_cents: t.variations?.[0]?.price_cents || 0,
      })),
      ...toppingsSavory.map(t => ({
        id: t.id,
        label: t.name,
        price_cents: t.variations?.[0]?.price_cents || 0,
      })),
    ]
  }

  // Drinks / Soup → sem toppings, só modal para special request
  return []
}


// ================================================================
// ADD TO CART
// ================================================================
function addToCart(item, addons = [], request = null) {
  const variation = item.variations?.[0]
  if (!variation) return

  const normalizedAddons = normalizeAddons(addons)

  // Verifica se já existe item igual (MESMAS addons)
  const found = cart.value.find(i =>
    i.variationId === variation.id &&
    addonsEqual(
      (i.addons || []).map(a => a.id),
      normalizedAddons
    )
  )

  if (found) {
    found.quantity++
    return
  }

  const addons_array = normalizedAddons.map(getAddonById)

  const lineId = crypto?.randomUUID
    ? crypto.randomUUID()
    : `${variation.id}-${Date.now()}`

  cart.value.push({
    lineId,
    id: item.id,
    variationId: variation.id,
    name: item.name,
    price_cents: Number(variation.price_cents),
    quantity: 1,
    image_url: item.image_url,
    addons: addons_array,
    special_request: request || null,
  })
}


// ================================================================
// Remove e adiciona do carrinho
// ================================================================
function removeFromCartByCartItem(cartItem) {
  const idx = cart.value.findIndex(i => i.lineId === cartItem.lineId)
  if (idx === -1) return
  if (cart.value[idx].quantity > 1) cart.value[idx].quantity--
  else cart.value.splice(idx, 1)
}

function addFromCartItem(cartItem) {
  cartItem.quantity++
}


// ================================================================
// ABRIR MODAL (novo item)
// ================================================================
function openCustomizationForNew(item) {
  selectedItemForCustomization.value = item
  selectedCartItemForCustomization.value = null

  addonsOptions.value = getToppingsForItem(item)
  selectedAddons.value = []
  specialRequest.value = ""

  showCustomizationModal.value = true
}


// ================================================================
// ABRIR MODAL PARA ITEM EXISTENTE
// ================================================================
function openCustomizationForExisting(cartItem) {
  selectedCartItemForCustomization.value = cartItem

  selectedItemForCustomization.value =
    menuFlat.value.find(i => i.id === cartItem.id) || null

  addonsOptions.value = getToppingsForItem(selectedItemForCustomization.value)

  selectedAddons.value = Array.isArray(cartItem.addons)
    ? cartItem.addons.map(a => a.id)
    : []

  specialRequest.value = cartItem.special_request || ""

  showCustomizationModal.value = true
}


// ================================================================
// FECHAR MODAL
// ================================================================
function closeCustomization() {
  showCustomizationModal.value = false
  selectedItemForCustomization.value = null
  selectedCartItemForCustomization.value = null
  selectedAddons.value = []
  specialRequest.value = ""
}


// ================================================================
// CONFIRMAR CUSTOMIZAÇÃO
// ================================================================
function confirmCustomization() {
  const normalized = normalizeAddons(selectedAddons.value)

  if (selectedCartItemForCustomization.value) {
    // Editar item existente
    selectedCartItemForCustomization.value.addons =
      normalized.map(getAddonById)

    selectedCartItemForCustomization.value.special_request =
      specialRequest.value || null
  } else if (selectedItemForCustomization.value) {
    // Novo item
    addToCart(
      selectedItemForCustomization.value,
      normalized,
      specialRequest.value
    )
  }

  closeCustomization()
}


// ================================================================
// Checkout
// ================================================================
function goToCheckout() {
  navigateTo('/order/checkout')
}

</script>


<style>
  body {
    background-color: #f9fafb;
  }
</style>
