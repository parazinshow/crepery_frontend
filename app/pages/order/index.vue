<template>
	<HeaderNav />

	<section class="bg-primary-50 w-full h-[calc(100vh-100px)]">
		<div class="max-w-7xl mx-auto p-6">
			<h1 class="text-4xl font-bold mb-6 text-center">MENU</h1>

			<!-- GRID PRINCIPAL: ESQUERDA MENU / DIREITA CARRINHO -->
			<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
				<!-- COLUNA ESQUERDA: MENU -->
				<div class="lg:col-span-3 bg-white shadow-lg rounded-lg px-8 py-4">
					<!-- Estado de carregamento -->
					<div v-if="loading" class="text-center text-gray-500 py-10">
						Loading menu...
					</div>

					<!-- Lista de itens do menu -->
					<div v-else class="divide-y">
						<div
							v-for="item in menu"
							:key="item.id"
							class="py-4 flex items-center gap-4"
						>
							<img
								:src="item.image_url"
								alt=""
								class="w-32 h-32 rounded-lg object-cover"
							/>
							<div class="flex-1">
								<h3 class="text-2xl font-bold">{{ item.name }}</h3>
								<p class="text-base text-gray-600">
									{{ item.description }}
								</p>

								<!-- evita erro se variations estiver vazio -->
								<p v-if="item.variations?.[0]" class="font-bold mt-1">
									${{ (item.variations[0].price_cents / 100).toFixed(2) }}
								</p>
								<p v-else class="text-gray-400 text-sm">Price unavailable</p>
							</div>

							<!-- Botão único de adicionar (abre customização) -->
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

				<!-- COLUNA DIREITA: RESUMO DO CARRINHO -->
				<div
					class="lg:col-span-2 bg-white shadow-lg rounded-lg p-8 flex flex-col"
				>
					<h3 class="text-2xl font-bold mb-4 text-center">Your cart</h3>

					<!-- Se carrinho estiver vazio -->
					<p
						v-if="!loading && cart.length === 0"
						class="text-gray-500 text-base text-center"
					>
						Your cart is empty.
					</p>

					<!-- Lista de itens no carrinho -->
					<div v-else class="flex-1 space-y-3 overflow-y-auto">
						<div
							v-for="cartItem in cart"
							:key="cartItem.lineId"
							class="border rounded-md p-3 flex flex-col gap-2"
						>
							<!-- Linha: nome e preço por crêpe -->
							<div class="flex justify-between items-start">
								<p class="text-xl font-semibold">
									{{ cartItem.name }}
								</p>
								<p class="text-xl font-semibold">
									${{
										(
											((cartItem.price_cents || 0) +
												getAddonsPriceCents(cartItem)) /
											100
										).toFixed(2)
									}}
								</p>
							</div>

							<!-- Add-ons com preços individuais -->
							<div class="mx-4">
								<ul
									v-if="cartItem.addons && cartItem.addons.length"
									class="text-md text-gray-500 space-y-0.5"
								>
									<li v-for="id in cartItem.addons" :key="id">
										{{ getAddonById(id)?.label }}
										<span class="text-gray-500 ml-4">
											+${{
												((getAddonById(id)?.price_cents || 0) / 100).toFixed(2)
											}}
										</span>
									</li>
								</ul>
								<p v-else class="text-xs text-gray-400"> No add-ons </p>
							</div>

							<!-- Controles: remover / adicionar / customizar -->
							<div class="flex flex-wrap items-center gap-2 mt-2">
								<!-- Botão de remover -->
								<button
									@click="removeFromCartByCartItem(cartItem)"
									class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
									title="Remover"
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
								<span class="text-md">{{ cartItem.quantity }}</span>

								<!-- Botão de adicionar -->
								<button
									@click="addFromCartItem(cartItem)"
									class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
									title="Adicionar"
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
								<button
									@click="openCustomizationForExisting(cartItem)"
									class="bg-primary-600 hover:bg-primary-800 text-white px-3 py-1 rounded-lg text-md"
								>
									Customize
								</button>
							</div>
						</div>
					</div>

					<!-- Total -->
					<div v-if="!loading" class="mt-4 items-center pt-3 border-t">
						<div
							v-if="cart.length !== 0"
							class="text-center text-md text-gray-500"
						>
							<span>{{ cart.length }} item(s) in total </span>
						</div>
						<div class="flex justify-between font-semibold text-lg">
							<span>Total:</span>
							<span>${{ (total / 100).toFixed(2) }}</span>
						</div>
					</div>

					<!-- Checkout -->
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

		<!-- MODAL DE CUSTOMIZAÇÃO -->
		<div
			v-if="showCustomizationModal"
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		>
			<div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
				<h3 class="text-xl font-semibold mb-2 text-center"> Customize </h3>
				<p class="text-sm text-gray-600 mb-4 text-center">
					Customize your treat with our delicious add-ons.
				</p>

				<!-- ADDONS COM PREÇO -->
				<div class="space-y-4 mb-4">
					<div>
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
				</div>

				<!-- Botões do modal -->
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
</template>

<script setup>
	import { ref, computed, onMounted, watch } from "vue";

	/* -------------------------------------------------------
 🧠 STATE PRINCIPAL
---------------------------------------------------------- */

	const menu = ref([]);
	const cart = ref([]);
	const loading = ref(true);

	// Opções de addons com preço (em centavos)
	const addonsOptions = [
		{
			id: "strawberries",
			label: "Strawberries",
			price_cents: 100,
		},
		{ id: "banana", label: "Banana", price_cents: 100 },
		{
			id: "blueberries",
			label: "Blueberries",
			price_cents: 150,
		},
		{ id: "nutella", label: "Nutella", price_cents: 200 },
		{
			id: "whipped_cream",
			label: "Whipped cream",
			price_cents: 100,
		},
	];

	// Modal de customização
	const showCustomizationModal = ref(false);
	const selectedItemForCustomization = ref(null); // item do menu
	const selectedCartItemForCustomization = ref(null); // item já no carrinho
	const selectedAddons = ref([]); // array de IDs de addons

	// Normaliza addons (ordena) pra comparação consistente
	function normalizeAddons(addons) {
		return [...addons].sort();
	}

	function addonsEqual(a, b) {
		if (!a && !b) return true;
		const aa = normalizeAddons(a || []);
		const bb = normalizeAddons(b || []);
		if (aa.length !== bb.length) return false;
		for (let i = 0; i < aa.length; i++) {
			if (aa[i] !== bb[i]) return false;
		}
		return true;
	}

	// Nome do item mostrado no modal
	const currentItemName = computed(() => {
		if (selectedItemForCustomization.value)
			return selectedItemForCustomization.value.name;
		if (selectedCartItemForCustomization.value)
			return selectedCartItemForCustomization.value.name;
		return "";
	});

	/* -------------------------------------------------------
 🚀 onMounted — Carrega o menu e carrinho salvo localmente
---------------------------------------------------------- */
	onMounted(async () => {
		try {
			const res = await $fetch("/api/order/menu");
			menu.value = res.items || [];
		} catch (e) {
			console.error("Erro ao carregar menu:", e);
		} finally {
			loading.value = false;
		}

		const savedCart = localStorage.getItem("crepegirl_cart");
		if (savedCart) {
			const parsed = JSON.parse(savedCart);
			// normaliza addons e garante um lineId por linha
			cart.value = parsed.map((item, index) => ({
				...item,
				addons: item.addons ? normalizeAddons(item.addons) : [],
				lineId: item.lineId || `${item.variationId}-${index}`, // fallback pra chave única
			}));
		}
	});

	/* -------------------------------------------------------
 🔎 Helpers de addons
---------------------------------------------------------- */

	function getAddonById(id) {
		return addonsOptions.find((a) => a.id === id) || null;
	}

	function getAddonLabels(addonIds) {
		return addonIds.map((id) => getAddonById(id)?.label).filter(Boolean);
	}

	function getAddonsPriceCents(cartItem) {
		if (!cartItem.addons || !cartItem.addons.length) return 0;
		return cartItem.addons.reduce((sum, id) => {
			const addon = getAddonById(id);
			return sum + (addon?.price_cents || 0);
		}, 0);
	}

	function getItemTotalCents(cartItem) {
		const base = cartItem.price_cents || 0;
		const addonsTotal = getAddonsPriceCents(cartItem);
		return (base + addonsTotal) * cartItem.quantity;
	}

	/* -------------------------------------------------------
 ➕➖ Funções de adicionar e remover itens do carrinho
---------------------------------------------------------- */

	// Adiciona um item ao carrinho, com addons opcionalmente
	function addToCart(item, addons = []) {
		const variation = item.variations?.[0];
		if (!variation || !variation.price_cents) return;

		const normalizedAddons = normalizeAddons(addons);

		// procura linha idêntica (mesma variação + mesmos addons)
		const found = cart.value.find(
			(i) =>
				i.variationId === variation.id &&
				addonsEqual(i.addons || [], normalizedAddons)
		);

		if (found) {
			// se a linha já existe exatamente igual, agrupa aumentando quantidade
			found.quantity++;
		} else {
			// nova linha no carrinho (lineId garante key única no v-for)
			cart.value.push({
				lineId: `${variation.id}-${Date.now()}-${Math.random()
					.toString(36)
					.slice(2)}`,
				id: item.id,
				variationId: variation.id,
				name: item.name,
				price_cents: variation.price_cents,
				quantity: 1,
				image_url: item.image_url,
				addons: normalizedAddons, // guarda IDs dos addons normalizados
			});
		}
	}

	// Remover a partir de um item já no carrinho (linha específica)
	function removeFromCartByCartItem(cartItem) {
		const index = cart.value.findIndex((i) => i.lineId === cartItem.lineId);
		if (index === -1) return;

		const found = cart.value[index];

		if (found.quantity > 1) found.quantity--;
		else cart.value.splice(index, 1);
	}

	// Adicionar diretamente a partir do item do carrinho (mesma linha / mesmas customizações)
	function addFromCartItem(cartItem) {
		cartItem.quantity++;
	}

	/* -------------------------------------------------------
 💰 Total — Calcula valor total do carrinho (base + addons)
---------------------------------------------------------- */

	const total = computed(() => {
		if (!cart.value.length) return 0;
		return cart.value.reduce((acc, item) => acc + getItemTotalCents(item), 0);
	});

	/* -------------------------------------------------------
 💾 Watch — Salva carrinho automaticamente
---------------------------------------------------------- */

	watch(
		cart,
		(newVal) => {
			localStorage.setItem("crepegirl_cart", JSON.stringify(newVal));
		},
		{ deep: true }
	);

	/* -------------------------------------------------------
 🧾 Navegação — Avança para o checkout
---------------------------------------------------------- */

	function goToCheckout() {
		navigateTo("/order/checkout");
	}

	/* -------------------------------------------------------
 🎛 Modal de customização
---------------------------------------------------------- */

	// Quando o usuário clica em "Adicionar" no menu (novo item)
	function openCustomizationForNew(item) {
		selectedItemForCustomization.value = item;
		selectedCartItemForCustomization.value = null;
		selectedAddons.value = [];
		showCustomizationModal.value = true;
	}

	// Quando o usuário clica em "Customizar" em um item já no carrinho
	function openCustomizationForExisting(cartItem) {
		selectedCartItemForCustomization.value = cartItem;
		selectedItemForCustomization.value =
			menu.value.find((i) => i.id === cartItem.id) || null;

		// Carrega addons já salvos nesse item do carrinho
		selectedAddons.value = cartItem.addons ? [...cartItem.addons] : [];
		showCustomizationModal.value = true;
	}

	function closeCustomization() {
		showCustomizationModal.value = false;
		selectedItemForCustomization.value = null;
		selectedCartItemForCustomization.value = null;
		selectedAddons.value = [];
	}

	function confirmCustomization() {
		const normalized = normalizeAddons(selectedAddons.value);

		// Editando item que já está no carrinho
		if (selectedCartItemForCustomization.value) {
			selectedCartItemForCustomization.value.addons = normalized;
		}
		// Adicionando item novo ao carrinho
		else if (selectedItemForCustomization.value) {
			addToCart(selectedItemForCustomization.value, normalized);
		}

		closeCustomization();
	}
</script>

<style>
	body {
		background-color: #f9fafb;
	}
</style>
