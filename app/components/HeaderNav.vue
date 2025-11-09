<template>
	<header>
		<nav class="relative z-30 bg-primary-100 px-2.5 sm:px-5 py-2.5">
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
					<ul class="flex items-center gap-8 font-medium">
						<li v-for="item in menuItems" :key="item.name">
							<NuxtLink :to="item.to" class="desktop-nav-item">
								{{ item.name }}</NuxtLink
							>
						</li>
					</ul>
				</div>

				<!-- Ações à direita -->
				<div class="flex items-center ml-auto">
					<a
						href="#"
						class="hidden lg:inline-flex text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5"
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
				class="hidden absolute inset-x-0 top-20 z-40 bg-primary-100 p-4 space-y-3 shadow-lg lg:hidden"
			>
				<ul class="flex flex-col items-center font-medium space-y-3">
					<li>
						<a
							href="#"
							class="inline-flex justify-center text-white bg-primary-700 font-bold rounded-lg text-sm px-4 py-2"
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
		{ name: "MENU", to: "/menu" },
		// { name: "CAKES", to: "/cakes" },
		// { name: "RETAIL", to: "/retail" },
		// { name: "CATERING", to: "/catering" },
		{ name: "OUR STORY", to: "/about" },
	];
</script>
