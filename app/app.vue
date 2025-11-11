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
  @import '@/assets/css/tailwind.css';
  @import 'flowbite/src/themes/default';
  @import url('https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@400;500;600;700;800&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap');
</style>
