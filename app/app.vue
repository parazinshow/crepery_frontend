<!-- =========================================================================
app.vue
----------------------------------------------------------------------------
Este arquivo é obrigatório para que layouts funcionem no Nuxt.

Sem isso, você recebe o warning:
  "[nuxt] Your project has layouts but <NuxtLayout /> was not used"

Aqui indicamos que TODAS as páginas devem usar o layout padrão.
========================================================================= -->

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
  // Adiciona o script do Square para pagamentos
  // producion: https://web.squarecdn.com/v1/square.js
  // sandbox: https://sandbox.web.squarecdn.com/v1/square.js
  useHead({
    script: [
      {
        src: "https://pay.google.com/gp/p/js/pay.js",
        async: true,
      },
      {
        src: "https://web.squarecdn.com/v1/square.js",
        defer: true,
      },
    ],
  })
</script>

<style>
  @import '@/assets/css/tailwind.css';
  @import 'flowbite/src/themes/default';
  @import url('https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@400;500;600;700;800&family=Alice&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap');
</style>
