// Composable responsável por gerenciar autenticação do admin
// - Lê e grava o token no localStorage (apenas no client)
// - Expõe estado reativo de token e se está autenticado
// - Faz login na API e guarda o token

import { ref, computed } from 'vue'
import { $fetch } from 'ofetch'

// Token compartilhado entre qualquer lugar que usar esse composable
const token = ref(null)

// Flag simples pra evitar ler o localStorage mais de uma vez
let initialized = false

// Inicializa o token lendo do localStorage (somente no client)
function initFromStorage() {
  if (initialized) return
  initialized = true

  if (process.client) {
    const stored = localStorage.getItem('admin_token')
    token.value = stored || null
  }
}

export function useAdminAuth() {
  // Garante que o token seja inicializado na primeira vez que usar o composable
  initFromStorage()

  // Computed simples dizendo se o usuário está logado ou não
  const isAuthenticated = computed(() => !!token.value)

  // Faz login na API e grava o token retornado
  async function login(pin) {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { pin }
    })

    if (!res.token) throw new Error('Invalid PIN')

    token.value = res.token
    localStorage.setItem('admin_token', res.token)
    isAuthenticated.value = true
  }

  // Atualiza o token em memória e no localStorage
  function setToken(newToken) {
    token.value = newToken

    if (process.client) {
      if (newToken) {
        localStorage.setItem('admin_token', newToken)
      } else {
        localStorage.removeItem('admin_token')
      }
    }
  }

  // Limpa token (logout básico)
  function clearToken() {
    setToken(null)
  }

  return {
    token,
    isAuthenticated,
    login,
    setToken,
    clearToken,
  }
}
