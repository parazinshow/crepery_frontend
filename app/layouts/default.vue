<!-- =========================================================================
default.vue (Layout padrão)
----------------------------------------------------------------------------
Este layout envolve TODAS as páginas do app.

Aqui colocamos o <BaseToast />, que exibe toasts globalmente.

Se você não incluir o <slot />, nada aparece na tela,
então ele sempre deve existir.
========================================================================= -->

<template>
  <div>
    <!-- Componente de toast global -->
    <BaseToast />

    <!-- Renderiza a página atual dentro do layout -->
    <slot />
  </div>
</template>

<script setup>
import BaseToast from '~/components/BaseToast.vue'
</script>
