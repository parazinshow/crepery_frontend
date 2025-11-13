// ===============================================
// ✅ Endpoint: Marcar pedido como concluído
// -----------------------------------------------
// Este endpoint é chamado quando o administrador
// clica no botão "Done" no painel. Ele atualiza o
// status do pedido no banco de dados para "done".
// Também envia um e-mail ao cliente avisando que
// o pedido está pronto para retirada.
// ===============================================

import prisma from '../../../utils/db.js'             // 🔹 Banco de dados
import { requireAuth } from '../../../utils/auth.js'   // 🔒 Autenticação
import { sendPickupReadyEmail } from '../../../utils/emailClient.js' 
// ✉️ Função que envia o email de “order ready”

export default defineEventHandler(async (event) => {
  // 🔐 Garante que apenas admins autenticados acessem
  await requireAuth(event)

  try {
    // 🆔 ID do pedido vindo da URL
    const id = event.context.params.id

    // 🔎 Busca o pedido ANTES para pegar email, items, etc.
    const orderBefore = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!orderBefore) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Pedido não encontrado',
      })
    }

    // 🗃️ Atualiza o pedido como DONE
    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'DONE' }
    })

    // ✉️ Se o pedido tinha e-mail, envia notificação
    if (orderBefore.email) {
      try {
        await sendPickupReadyEmail({
          to: orderBefore.email,
          orderNumber: orderBefore.dailyNumber,
          items: orderBefore.items,
        })
      } catch (emailErr) {
        console.error('⚠️ Erro ao enviar email de pickup:', emailErr)
        // NÃO lança erro — o pedido já foi atualizado
      }
    }

    // 🔄 Retorna sucesso para o frontend
    return { success: true, order: updated }

  } catch (err) {
    console.error('❌ Erro ao marcar pedido como concluído:', err)

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao atualizar pedido',
    })
  }
})
