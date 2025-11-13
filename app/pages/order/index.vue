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
                      {{ addon?.label }}
                      <span class="ml-4">
                        +${{ ((addon?.price_cents || 0) / 100).toFixed(2) }}
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
  import {ref, computed, onMounted, watch} from 'vue'

  // Imagem transparente usada como fallback em casos sem imagem
  const placeholder =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' // 1x1 transparente

  // Estrutura do menu completa separada por categorias
  const menuSections = ref({
    sweetItems: [], // crepes doces
    savoryItems: [], // crepes salgados
    drinks: [], // bebidas
    croissants: [],
    onionSoup: [],  
    toppingsSweet: [], // toppings de doces
    toppingsSavory: [], // toppings de salgados
  })

  // "menuFlat" é um array plano com todos os itens principais (sem toppings)
  const menuFlat = computed(() => [
    ...menuSections.value.sweetItems,
    ...menuSections.value.savoryItems,
    ...menuSections.value.drinks,
    ...menuSections.value.croissants,
    ...menuSections.value.onionSoup,
  ])

  // Estado do carrinho
  const cart = ref([])
  // Indicador de carregamento (exibe “Loading...” até o menu ser carregado)
  const loading = ref(true)

  // addonsOptions é preenchido dinamicamente com toppings do cache
  const addonsOptions = ref([])

  // Controle do modal de customização
  const showCustomizationModal = ref(false)
  const selectedItemForCustomization = ref(null) // item do menu sendo customizado
  const selectedCartItemForCustomization = ref(null) // item já existente no carrinho
  const selectedAddons = ref([]) // lista de addons selecionados

  // CATEGORIAS PRINCIPAIS DO MENU
  const categorizedMenu = computed(() => [
    {
      key: 'sweet',
      title: '🥞 Sweet Crepes',
      items: menuSections.value.sweetItems
    },
    {
      key: 'savory',
      title: '🥓 Savory Crepes',
      items: menuSections.value.savoryItems
    },
    {
      key: 'croissants',
      title: '🥐 Croissants',
      items: menuSections.value.croissants || []
    },
    {
      key: 'onionSoup',
      title: '🍲 Onion Soup',
      items: menuSections.value.onionSoup || []
    },
    {
      key: 'drinks',
      title: '🥤 Drinks',
      items: menuSections.value.drinks
    }
  ])

  // Scroll suave até a seção clicada
  function scrollToSection(key) {
    const el = document.getElementById('section-' + key)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
      (sum, addon) => sum + (addon.price_cents || 0),
      0
    )
  }

  // Calcula o preço total de um item em centavos (base + addons)
  function getItemTotalCents(cartItem) {
    const base = Number(cartItem.price_cents || 0)
    const addonsTotal = getAddonsPriceCents(cartItem)
    return (base + addonsTotal) * Number(cartItem.quantity || 1)
  }

  // Executa ao montar o componente — busca menu + carrega carrinho
  onMounted(async () => {
    try {
      // Busca o menu atualizado no backend
      const res = await $fetch('/api/order/menu')
      // Lê categorias com fallback em caso de estrutura diferente
      const categories = res?.categories || res?.data?.categories || {}
      // Popula o estado do menu
      menuSections.value = {
        sweetItems: (categories.sweetItems || []).map(i => ({ ...i, type: 'sweet' })),
        savoryItems: (categories.savoryItems || []).map(i => ({ ...i, type: 'savory' })),
        drinks: (categories.drinks || []).map(i => ({ ...i, type: 'drinks' })),

        croissants: (categories.croissants || []).map(i => ({ ...i, type: 'croissant' })),
        onionSoup: (categories.onionSoup || []).map(i => ({ ...i, type: 'onionSoup' })),

        toppingsSweet: categories.toppingsSweet || [],
        toppingsSavory: categories.toppingsSavory || [],
      }

      // Salva a porcentagem de taxa (tax) no localStorage para o checkout
      if (res?.tax != null) {
        localStorage.setItem(
          'crepegirl_tax_percentage',
          String(res.tax.percentage)
        )
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

  // Adiciona um novo item (ou aumenta quantidade se já existir)
  function addToCart(item, addons = []) {
    const variation = item.variations?.[0]
    if (!variation || variation.price_cents == null) return

    const normalizedAddons = normalizeAddons(addons)

    const found = cart.value.find(
      (i) =>
        i.variationId === variation.id &&
        addonsEqual(
          (i.addons || []).filter((a) => a && a.id).map((a) => a.id) || [],
          normalizedAddons
        )
    )

    // Se o item já existe com as mesmas customizações, só aumenta a quantidade
    if (found) {
      found.quantity = Number(found.quantity || 1) + 1
    } else {
      const addons_array = normalizedAddons.map(getAddonById)
      // Gera um ID único para o item no carrinho
      const lineId = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${variation.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      // Adiciona ao carrinho
      cart.value.push({
        lineId,
        id: item.id,
        variationId: variation.id,
        name: item.name,
        price_cents: Number(variation.price_cents || 0),
        quantity: 1,
        image_url: item.image_url,
        addons: addons_array,
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

  // Determina se o item aceita toppings baseado no NOME
  function getToppingsForItem(item) {
    if (!item) return []

    const {
      sweetItems,
      savoryItems,
      croissants,
      toppingsSweet,
      toppingsSavory
    } = menuSections.value

    // ✔ Sweet crepe → somente sweet toppings
    if (sweetItems.some(i => i.id === item.id)) {
      return [
        ...toppingsSweet.map(t => ({
          id: t.id,
          label: t.name,
          price_cents: t.variations?.[0]?.price_cents || 0,
        }))
      ]
    }

    // ✔ Savory crepe → somente savory toppings
    if (savoryItems.some(i => i.id === item.id)) {
      return [
        ...toppingsSavory.map(t => ({
          id: t.id,
          label: t.name,
          price_cents: t.variations?.[0]?.price_cents || 0,
        }))
      ]
    }

    // ✔ Croissants → toppingsSweet + toppingsSavory (ambos)
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
        }))
      ]
    }

    // ❌ Drinks e Soups → sem toppings
    return []
  }



  // Soma o total de todos os itens + addons
  const total = computed(
    () => cart.value.reduce((acc, item) => acc + getItemTotalCents(item), 0)
  )

  // Salva o carrinho no localStorage sempre que houver alteração
  watch(
    cart,
    (val) => {
      localStorage.setItem('crepegirl_cart', JSON.stringify(val))
    },
    {deep: true}
  )

  function goToCheckout() {
    navigateTo('/order/checkout')
  }

  // Verifica se o item precisa abrir modal de customização
  function itemNeedsModal(item) {
    const { sweetItems, savoryItems, croissants } = menuSections.value

    if (sweetItems.some(i => i.id === item.id)) return true
    if (savoryItems.some(i => i.id === item.id)) return true
    if (croissants.some(i => i.id === item.id)) return true

    // Drinks e Onion Soup NÃO abrem modal
    return false
  }

  // Abre o modal de customização ao adicionar um novo item
  function openCustomizationForNew(item) {
    // Se não aceita toppings → adiciona direto
    if (!itemNeedsModal(item)) {
      const variation = item.variations?.[0]
      if (variation) {
        addToCart(item, [])
      }
      return
    }
    selectedItemForCustomization.value = item
    selectedCartItemForCustomization.value = null

    // Calcula os toppings possíveis para esse item
    addonsOptions.value = getToppingsForItem(item)

    selectedAddons.value = []
    showCustomizationModal.value = true
  }

  // Abre o modal para editar um item já existente no carrinho
  function openCustomizationForExisting(cartItem) {
    selectedCartItemForCustomization.value = cartItem
    selectedItemForCustomization.value =
      menuFlat.value.find((i) => i.id === cartItem.id) || null

    // Calcula os toppings possíveis para esse item
    addonsOptions.value = getToppingsForItem(selectedItemForCustomization.value)

    selectedAddons.value = Array.isArray(cartItem.addons)
      ? cartItem.addons.filter((a) => a && a.id).map((a) => a.id)
      : []
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
      // Atualiza os add-ons do item já existente no carrinho
      selectedCartItemForCustomization.value.addons =
        normalized.map(getAddonById)
    } else if (selectedItemForCustomization.value) {
      // Adiciona um novo item já com esses add-ons
      addToCart(selectedItemForCustomization.value, normalized)
    }
    closeCustomization()
  }
</script>

<style>
  body {
    background-color: #f9fafb;
  }
</style>
