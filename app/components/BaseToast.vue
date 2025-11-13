<!-- =========================================================================
BaseToast.vue
----------------------------------------------------------------------------
Este componente exibe toasts globais usando <Teleport> para renderizar
direto no <body>, acima de todo o app.

Ele consome o estado do composable useToast(), que mantém a lista
reativa de toasts.

Qualquer lugar do app pode chamar:
    showToast("Mensagem", "success")
    showToast("Erro", "error")
    showToast("Info", "info")
========================================================================= -->

<template>
  <Teleport to="body">
    <!-- Container fixo no topo da tela -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">

      <!-- Renderiza cada toast -->
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="[
          'px-4 py-3 rounded shadow text-white animate-fade',
          {
            'bg-green-600': t.type === 'success',
            'bg-red-600': t.type === 'error',
            'bg-blue-600': t.type === 'info',
          }
        ]"
      >
        {{ t.message }}
      </div>

    </div>
  </Teleport>
</template>

<script setup>
// Importa lista de toasts do composable global
import { useToast } from '~/composables/useToast'
const { toasts } = useToast()
</script>

<style>
/* Animação simples de entrada */
@keyframes fade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade {
  animation: fade 0.2s ease-out;
}
</style>
