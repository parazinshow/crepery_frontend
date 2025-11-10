// ===============================================
// ✅ Endpoint: Marcar pedido como concluído
// -----------------------------------------------
// Este endpoint é chamado quando o administrador
// clica no botão "Done" no painel. Ele atualiza o
// status do pedido no banco de dados para "done".
// ===============================================

import prisma from '../../../utils/db.js'          // 🔹 Importa o cliente Prisma (conexão com o banco de dados)
import { requireAuth } from '../../../utils/auth.js' // 🔒 Middleware que verifica o token JWT do admin

export default defineEventHandler(async (event) => {
  // 🔐 Garante que apenas usuários autenticados (com token válido) acessem este endpoint
  await requireAuth(event)

  try {
    // 🆔 Obtém o ID do pedido a partir da URL (ex: /api/order/123/done)
    const id = event.context.params.id

    // 🗃️ Atualiza o pedido no banco de dados, mudando o status para "done"
    const updated = await prisma.order.update({
      where: { id },           // localiza o pedido pelo ID
      data: { status: 'DONE' } // atualiza o campo status
    })

    // ✅ Retorna sucesso e o pedido atualizado para o frontend
    return { success: true, order: updated }

  } catch (err) {
    // ❌ Captura e loga qualquer erro ocorrido durante a atualização
    console.error('❌ Erro ao marcar pedido como concluído:', err)

    // 🚨 Retorna erro 500 para o frontend
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao atualizar pedido',
    })
  }
})
