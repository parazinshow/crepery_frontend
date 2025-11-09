<script setup></script>

<template>
	<HeaderNav />

	<!-- Hero Section -->
	<section class="relative w-full h-[calc(100vh-100px)] overflow-hidden">
		<!-- Vídeo de fundo -->
		<video
			autoplay
			loop
			muted
			playsinline
			class="absolute inset-0 w-full h-full object-cover"
		>
			<source src="/videos/crepeVideo.mp4" type="video/mp4" />
			Seu navegador não suporta vídeos em HTML5.
		</video>

		<!-- Camada escura (opcional, melhora legibilidade do texto) -->
		<div class="absolute inset-0 bg-black bg-opacity-30"></div>

		<!-- Texto central -->
		<div
			class="relative z-10 flex flex-col justify-center items-center text-center h-full px-6"
		>
			<h1
				class="text-white text-4xl md:text-6xl font-extrabold max-w-3xl leading-tight drop-shadow-lg"
			>
				Your french window down the slopes
			</h1>
			<p class="mt-4 text-lg text-gray-100 max-w-2xl drop-shadow-md">
				Freshly made crepes and coffee, right where the mountains meet France.
			</p>
		</div>
	</section>
</template>
