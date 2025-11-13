<script setup>
</script>

<template>
	<!-- Cabeçalho fixo da página -->
	<HeaderNav />

	<!-- Área principal -->
	<main
		class="min-h-[calc(100vh-180px)] background flex items-center justify-center"
	>
		<section
			class="mx-auto p-10 flex flex-col items-center gap-10 w-full max-w-screen-xl"
		>
			<!-- Título central da página -->
			<h1
				class="page-title text-5xl lg:text-7xl text-center w-full"
			>
				Menu
			</h1>

			<!-- Imagem logo após o título -->
			<img
				src="/images/winter-menu.png"
				alt="Menu banner"
				class="w-full h-auto object-contain"
			/>
		</section>
	</main>

	<Footer />
</template>

<style scoped>
	/* Nenhum CSS adicional — tudo feito com Tailwind */
</style>
