// ===================================================================
// useTimeAgo.js
// -------------------------------------------------------------------
// Este composable fornece a função "timeAgo" que converte datas para
// formato amigável, como:
// - "30s atrás"
// - "5min atrás"
// - "2h atrás"
// - "1d atrás"
//
// Ele NÃO roda automaticamente — você importa o composable, extrai a
// função e usa no template.
//
// Exemplo:
//   import { useTimeAgo } from '~/composables/useTimeAgo'
//   const { timeAgo } = useTimeAgo()
// ===================================================================

export function useTimeAgo() {
  // Função principal que recebe uma data (ou string de data)
  // e retorna texto humano indicando quanto tempo passou.
  function timeAgo(date) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000 // diferença em segundos

    if (diff < 60) return `${Math.floor(diff)}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`

    return `${Math.floor(diff / 86400)}d ago`
  }

  return { timeAgo }
}
