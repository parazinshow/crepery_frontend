<script setup>
	import { onMounted, ref } from "vue";
	import { initFlowbite } from "flowbite";

	onMounted(() => {
		initFlowbite();
	});

	// Array de imagens do carrossel
	const photos = ref([
		{ src: "/images/about-1.jpg", alt: "Our story photo 1" },
		{ src: "/images/about-2.jpg", alt: "Our story photo 2" },
		{ src: "/images/about-3.jpg", alt: "Our story photo 3" },
		{ src: "/images/about-4.jpg", alt: "Our story photo 4" },
		{ src: "/images/about-5.jpg", alt: "Our story photo 5" },
	]);
</script>

<template>
	<HeaderNav />

	<main
		class="min-h-[calc(100vh-100px)] bg-primary-50 flex items-center justify-center"
	>
		<section
			class="mx-auto p-10 flex flex-col items-center gap-10 w-full max-w-screen-xl"
		>
			<!-- TÍTULO CENTRALIZADO -->
			<h1
				class="text-3xl md:text-7xl font-bold text-primary-700 text-center w-full"
			>
				Our Story
			</h1>

			<!-- BLOCO COM TEXTO E CARROSSEL -->
			<div class="flex flex-col lg:flex-row items-center gap-10 w-full">
				<!-- TEXTO -->
				<div class="w-full lg:w-1/2 space-y-4 text-justify">
					<p class="text-gray-700 leading-relaxed">
						Born from a lifelong love of French flavors and mountain living, The
						Crêpe Girl brings a taste of Paris to the heart of Vail.
					</p>
					<p class="text-gray-700 leading-relaxed">
						Founded by Shana Azerad, a French-American entrepreneur with a
						passion for hospitality, our little crêpe window started as a summer
						market stand and quickly became a local favorite.
					</p>
					<p class="text-gray-700 leading-relaxed">
						Inspired by cozy alpine chalets, long ski days, and the simple joy
						of serving freshly made French comforting food using high-quality,
						often locally sourced ingredients.
					</p>
					<p class="text-gray-700 leading-relaxed">
						Now nestled on Bridge Street, just steps from the slopes, The Crêpe
						Girl is ready to flip some crepe and spread lots of smiles.
					</p>
					<p class="text-gray-700 leading-relaxed">
						We are so happy to bring your little French window down the slope —
						your ski days will never be the same!
					</p>
					<p class="text-gray-700 leading-relaxed text-center">
						Bienvenue, and bon appétit!
					</p>
				</div>

				<!-- CARROSSEL FLOWBITE -->
				<div class="w-full lg:w-1/2 rounded-lg shadow-lg overflow-hidden">
					<div
						id="about-carousel"
						class="relative w-full"
						data-carousel="slide"
						data-carousel-interval="3000"
					>
						<!-- Slides -->
						<div
							class="relative w-full aspect-[4/3] overflow-hidden rounded-lg"
						>
							<div
								v-for="(item, index) in photos"
								:key="item.src"
								class="hidden duration-700 ease-in-out"
								:data-carousel-item="index === 0 ? 'active' : ''"
							>
								<img
									:src="item.src"
									:alt="item.alt"
									class="absolute block w-full h-full object-cover -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
								/>
							</div>
						</div>

						<!-- Indicadores -->
						<div
							class="absolute z-30 flex -translate-x-1/2 bottom-4 left-1/2 space-x-3 rtl:space-x-reverse"
						>
							<button
								v-for="(item, index) in photos"
								:key="index"
								type="button"
								class="w-3 h-3 rounded-full"
								:aria-label="`Slide ${index + 1}`"
								:data-carousel-slide-to="index"
							></button>
						</div>

						<!-- Botão anterior -->
						<button
							type="button"
							class="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
							data-carousel-prev
						>
							<span
								class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 group-hover:bg-white/50 group-focus:ring-4 group-focus:ring-white group-focus:outline-none"
							>
								<svg
									class="w-4 h-4 text-white rtl:rotate-180"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 6 10"
								>
									<path
										stroke="currentColor"
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 1 1 5l4 4"
									/>
								</svg>
							</span>
						</button>

						<!-- Botão próximo -->
						<button
							type="button"
							class="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
							data-carousel-next
						>
							<span
								class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 group-hover:bg-white/50 group-focus:ring-4 group-focus:ring-white group-focus:outline-none"
							>
								<svg
									class="w-4 h-4 text-white rtl:rotate-180"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 6 10"
								>
									<path
										stroke="currentColor"
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="m1 9 4-4-4-4"
									/>
								</svg>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>
	</main>
</template>

<style scoped>
	/* sem CSS extra — tudo via Tailwind */
</style>
