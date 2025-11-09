<template>
  <div class="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
    <h2 class="text-2xl font-bold mb-4 text-center">🍓 Menu — The Crêpe Girl</h2>

    <!-- Estado de carregamento -->
    <div v-if="loading" class="text-center text-gray-500 py-10">
      Loading menu...
    </div>

    <!-- Lista de itens -->
    <div
      v-else
      v-for="item in menu"
      :key="item.id"
      class="border-b py-3 flex items-center gap-4"
    >
      <img
        :src="item.image_url"
        alt=""
        class="w-20 h-20 rounded-lg object-cover"
      />
      <div class="flex-1">
        <h3 class="text-lg font-semibold">{{ item.name }}</h3>
        <p class="text-sm text-gray-600">{{ item.description }}</p>

        <!-- evita erro se variations estiver vazio -->
        <p v-if="item.variations?.[0]" class="font-bold mt-1">
          ${{ (item.variations[0].price_cents / 100).toFixed(2) }}
        </p>
        <p v-else class="text-gray-400 text-sm">Price unavailable</p>
      </div>

      <!-- Botões de adicionar/remover -->
      <div class="flex items-center gap-2">
        <button
          @click="removeFromCart(item)"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 rounded"
        >
          −
        </button>
        <span>{{ getQuantity(item.id) }}</span>
        <button
          @click="addToCart(item)"
          class="bg-blue-600 hover:bg-blue-700 text-white px-2 rounded"
        >
          +
        </button>
      </div>
    </div>

    <!-- Total -->
    <div v-if="!loading" class="mt-6 flex justify-between items-center text-lg font-semibold">
      <span>Total:</span>
      <span>${{ (total / 100).toFixed(2) }}</span>
    </div>

    <!-- Checkout -->
    <button
      v-if="!loading"
      @click="goToCheckout"
      :disabled="cart.length === 0"
      class="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
    >
      Continue to Checkout
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

/* -------------------------------------------------------
 🧠 STATE PRINCIPAL
---------------------------------------------------------- */

// `menu` armazena a lista de itens retornados da API /api/menu
// `cart` representa o carrinho atual do cliente (itens adicionados)
// `loading` controla o estado de carregamento da tela inicial
const menu = ref([])
const cart = ref([])
const loading = ref(true)

/* -------------------------------------------------------
 🚀 onMounted — Carrega o menu e carrinho salvo localmente
---------------------------------------------------------- */
onMounted(async () => {
  try {
    // Busca o menu atualizado diretamente do backend (Square)
    const res = await $fetch('/api/menu')
    // Define os itens retornados ou um array vazio caso falhe
    menu.value = res.items || []
  } catch (e) {
    // Em caso de erro de rede ou servidor, loga o erro
    console.error('Erro ao carregar menu:', e)
  } finally {
    // Finaliza o estado de carregamento, garantindo que o template renderize
    loading.value = false
  }

  // Se o cliente já tinha itens no carrinho, recarrega do localStorage
  const savedCart = localStorage.getItem('crepegirl_cart')
  if (savedCart) cart.value = JSON.parse(savedCart)
})

/* -------------------------------------------------------
 ➕➖ Funções de adicionar e remover itens do carrinho
---------------------------------------------------------- */

/**
 * Adiciona um item (e sua variação) ao carrinho.
 * - Cada produto da Square pode ter variações (tamanhos, sabores, etc.)
 * - Aqui estamos pegando apenas a primeira variação disponível.
 */
function addToCart(item) {
  const variation = item.variations?.[0]
  if (!variation || !variation.price_cents) return // ignora se não tiver preço

  // Procura no carrinho se já existe a variação selecionada
  const found = cart.value.find(i => i.variationId === variation.id)
  if (found) {
    // Se já existe, apenas incrementa a quantidade
    found.quantity++
  } else {
    // Caso contrário, adiciona um novo item ao carrinho
    cart.value.push({
      id: item.id,                // ID do produto
      variationId: variation.id,  // ID da variação específica
      name: item.name,            // Nome exibido
      price_cents: variation.price_cents, // preço em centavos (inteiro)
      quantity: 1,
      image_url: item.image_url,  // imagem opcional para exibir no checkout
    })
  }
}

/**
 * Remove um item do carrinho (ou diminui sua quantidade).
 * - Se a quantidade chegar a 0, o item é removido completamente.
 */
function removeFromCart(item) {
  const variation = item.variations?.[0]
  if (!variation) return

  const found = cart.value.find(i => i.variationId === variation.id)
  if (!found) return

  if (found.quantity > 1) found.quantity-- // diminui quantidade
  else cart.value = cart.value.filter(i => i.variationId !== variation.id) // remove item
}

/* -------------------------------------------------------
 🔍 Função auxiliar — Retorna quantidade de um item
---------------------------------------------------------- */

/**
 * Retorna a quantidade atual de determinado item no carrinho
 * para exibir no botão de controle (ex: + ou - no menu).
 */
function getQuantity(id) {
  const item = menu.value.find(i => i.id === id)
  const variation = item?.variations?.[0]
  if (!variation) return 0
  return cart.value.find(i => i.variationId === variation.id)?.quantity || 0
}

/* -------------------------------------------------------
 💰 Total — Calcula valor total do carrinho
---------------------------------------------------------- */

/**
 * Computed property que soma todos os itens do carrinho.
 * - Mantém valores em CENTAVOS para evitar erros de arredondamento.
 * - No template, dividimos por 100 para mostrar em dólares.
 */
const total = computed(() => {
  if (!cart.value.length) return 0
  return cart.value.reduce((acc, i) => acc + (i.price_cents || 0) * i.quantity, 0)
})

/* -------------------------------------------------------
 💾 Watch — Salva carrinho automaticamente
---------------------------------------------------------- */

/**
 * Sempre que o carrinho mudar (adicionar/remover item),
 * ele é salvo automaticamente no localStorage.
 * Isso garante persistência mesmo se o usuário recarregar a página.
 */
watch(
  cart,
  (newVal) => {
    localStorage.setItem('crepegirl_cart', JSON.stringify(newVal))
  },
  { deep: true } // observa mudanças em propriedades internas (como quantity)
)

/* -------------------------------------------------------
 🧾 Navegação — Avança para o checkout
---------------------------------------------------------- */

/**
 * Envia o usuário para a página de checkout,
 * onde ele verá o resumo e poderá pagar com Square.
 */
function goToCheckout() {
  navigateTo('/order/checkout')
}
</script>



<style>
body {
  background-color: #f9fafb;
}
</style>
