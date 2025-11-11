<template>
	<header>
		<nav class="relative z-30 background px-2.5 sm:px-5 py-2.5 shadow-md">
			<div class="flex items-center mx-auto max-w-screen-xl h-20">
				<!-- Logo -->
				<NuxtLink to="/" class="flex items-center">
					<img
						src="/images/logo-image.png"
						class="h-16 mr-3"
						alt="Logo image"
					/>
					<img
						src="/images/logo-text.png"
						class="h-10 sm:h-14 w-auto"
						alt="Logo text"
					/>
				</NuxtLink>

				<!-- MENU DESKTOP -->
				<div class="hidden lg:flex flex-1 justify-center">
					<ul class="flex items-center gap-8">
						<li v-for="item in menuItems" :key="item.name">
							<NuxtLink :to="item.to" class="mobile-nav-item lg:desktop-nav-item">
								{{ item.name }}</NuxtLink
							>
						</li>
					</ul>
				</div>

				<!-- Ações à direita -->
				<div class="flex items-center ml-auto">
					<a
						href="/order"
						class="hidden lg:inline-flex default-button-desktop text-lg px-5 py-2.5"
					>
						ORDER NOW
					</a>

					<!-- Botão hamburger (só mobile) -->
					<button
						data-collapse-toggle="mobile-menu-2"
						type="button"
						class="inline-flex items-center p-2 ml-2 text-sm rounded-lg lg:hidden"
					>
						<svg class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4A1 1 0 013 5zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 000 2h12a1 1 0 100-2H4z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- MENU MOBILE -->
			<div
				id="mobile-menu-2"
				class="hidden absolute inset-x-0 top-20 z-40 background p-4 space-y-3 shadow-lg lg:hidden"
			>
				<ul class="flex flex-col items-center font-medium space-y-3">
					<li>
						<a
							href="/order"
							class="inline-flex justify-center default-button text-lg px-4 py-2"
						>
							ORDER NOW
						</a>
					</li>

					<li v-for="item in menuItems" :key="item.name">
						<NuxtLink :to="item.to" class="mobile-nav-item">
							{{ item.name }}
						</NuxtLink>
					</li>
				</ul>
			</div>
		</nav>
	</header>
</template>

<script setup>
	const menuItems = [
		{ name: "CAKES", to: "/cakes" },
		{ name: "RETAIL", to: "/retail" },
		{ name: "OUR STORY", to: "/about" },
	];
</script>
