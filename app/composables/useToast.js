// ===================================================================
// useToast.js
// -------------------------------------------------------------------
// Composable responsável por exibir toasts globais no app.
//
// Como funciona:
// 🔹 "toasts" é um array reativo de mensagens
// 🔹 "showToast" adiciona um toast e remove automaticamente após X ms
// 🔹 O componente BaseToast.vue observa esse array e exibe os toasts
//
// Tipos disponíveis:
//   showToast("OK", "success")
//   showToast("Erro", "error")
//   showToast("Info", "info")
//
// Este sistema não depende de bibliotecas externas.
// ===================================================================

import { ref } from 'vue'

// Estado global compartilhado entre todos os componentes
const toasts = ref([])

export function useToast() {
  // Exibe um toast temporário
  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random() // id único
    toasts.value.push({ id, message, type })

    // Remove o toast depois do tempo definido
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    showToast,
  }
}
