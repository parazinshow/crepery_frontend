<template>
	<div>
		<NuxtRouteAnnouncer />
		<NuxtPage />
	</div>
</template>

<script setup>
// Adiciona o script do Square para pagamentos
// producion: https://web.squarecdn.com/v1/square.js
useHead({
  script: [
    {
      src: 'https://sandbox.web.squarecdn.com/v1/square.js',
      defer: true,
    },
  ],
})
</script>

<style>
	@import "@/assets/css/tailwind.css";
	@import "flowbite/src/themes/default";
</style>
