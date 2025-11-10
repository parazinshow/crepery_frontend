// ===============================================
// 📋 Endpoint: Listar pedidos abertos (admin)
// -----------------------------------------------
// Este endpoint retorna todos os pedidos que ainda
// não foram marcados como "done" no banco de dados.
// Ele é usado no painel administrativo da creperia
// para exibir os pedidos que precisam ser preparados.
// ===============================================

import prisma from '../../utils/db.js'       // 🗃️ ORM Prisma para consultar o banco de dados
import { requireAuth } from '../../utils/auth.js' // 🔒 Middleware de autenticação via JWT

export default defineEventHandler(async (event) => {
  // 🔐 Garante que apenas o admin autenticado (com token válido) possa acessar
  await requireAuth(event)

  try {
    // 📦 Busca todos os pedidos no banco de dados que ainda estão "abertos"
    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'DONE' },  // ❗ Exclui pedidos já finalizados
      },
      include: { items: true },   // 🔗 Inclui os itens de cada pedido (relação 1:N)
      orderBy: { createdAt: 'desc' }, // ⏰ Mostra do mais recente para o mais antigo
    })

    // ✅ Retorna o resultado com sucesso
    return { success: true, orders }

  } catch (err) {
    // ❌ Caso ocorra qualquer erro na consulta, registra no console
    console.error('❌ Erro ao buscar pedidos:', err)

    // 🚨 Lança erro 500 (erro interno do servidor)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao buscar pedidos no banco',
    })
  }
})
