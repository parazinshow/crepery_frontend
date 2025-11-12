<script setup></script>

<template>
	<!-- CONTAINER DA PÁGINA INTEIRA -->
	<div class="min-h-screen flex flex-col relative">

		<!-- VÍDEO FIXO NO FUNDO (PARALLAX) -->
		<div class="fixed inset-0 -z-10 overflow-hidden">
			<video
				autoplay
				loop
				muted
				playsinline
				class="w-full h-full object-cover"
			>
				<source src="/videos/crepeVideo.mp4" type="video/mp4" />
				Seu navegador não suporta vídeos em HTML5.
			</video>
			<!-- camada escura para legibilidade -->
			<div class="absolute inset-0 bg-black/35"></div>
		</div>

		<!-- HEADER NO TOPO -->
		<HeaderNav />

		<!-- ÁREA CENTRAL: dividida igualmente em 2 blocos -->
		<main class="flex-1 flex flex-col">

			<!-- METADE DE CIMA: HERO -->
			<section
				class="flex-1 flex flex-col items-center justify-center text-center px-6"
			>
				<h1
					class="hero-title max-w-4xl leading-tight drop-shadow-lg mt-16"
				>
					YOUR FRENCH WINDOW DOWN THE SLOPES
				</h1>
				<p class="hero-subtitle mt-4 max-w-2xl drop-shadow">
					Freshly made crepes and coffee, right where the mountains meet France.
				</p>
			</section>

			<!-- METADE DE BAIXO: LOCALIZAÇÃO / GOOGLE MAPS -->
			<section
				class="flex-1 flex justify-center items-center"
			>
				<div
					class="max-w-xl w-full bg-primary-50 p-4 m-4 rounded-2xl shadow-xl text-center"
				>
					<h2 class="text-2xl md:text-3xl font-bold text-primary-700 mb-4">
						Where to find us
					</h2>
					<p class="text-gray-700 mb-3">
						We’re located in the heart of Vail Village — just steps from the slopes.
					</p>
					<p class="text-sm text-gray-500 mb-6">
						123 Bridge Street, Vail, CO
					</p>

					<a
						href="https://maps.google.com/?q=The+Crepe+Girl+Vail"
						target="_blank"
						rel="noopener"
						class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-primary-300"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 2C8.13 2 5 5.13 5 9c0 4.52 7 13 7 13s7-8.48 7-13c0-3.87-3.13-7-7-7z"
							/>
							<circle cx="12" cy="9" r="2.5" fill="currentColor" />
						</svg>
						View on Google Maps
					</a>
				</div>
			</section>
		</main>

		<!-- FOOTER NO FINAL -->
		<Footer />
	</div>
</template>
