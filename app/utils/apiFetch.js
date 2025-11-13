// Função utilitária para chamadas de API autenticadas
// - Adiciona automaticamente o header Authorization se houver token
// - Se der 401, limpa o token (logout "silencioso") e relança o erro

import { $fetch } from 'ofetch'
import { useAdminAuth } from '~/composables/useAdminAuth'

export async function apiFetch(url, options = {}) {
  // Pega token e função de limpar token do composable de auth
  const { token, clearToken } = useAdminAuth()

  try {
    // Faz a chamada com o header Authorization (se existir token)
    return await $fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token.value
          ? { Authorization: `Bearer ${token.value}` }
          : {}),
      },
    })
  } catch (err) {
    console.error('Erro na chamada de API:', err)

    // Se for 401, considera que a sessão expirou e limpa o token
    if (err?.status === 401 || err?.response?.status === 401) {
      clearToken()
    }

    // Relança o erro para o componente tratar mensagens para o usuário
    throw err
  }
}
