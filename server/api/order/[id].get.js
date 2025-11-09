// ===============================================
// 📦 Endpoint: Buscar Pedido por ID
// -----------------------------------------------
// Este endpoint é chamado quando o cliente acessa
// a página /order/[id]. Ele tenta localizar o pedido
// no banco de dados, tanto pelo ID interno (Prisma)
// quanto pelo ID da Square (squareId), e retorna os
// detalhes do pedido, incluindo os itens.
// ===============================================

import prisma from '../../utils/db.js' // 🧱 Cliente Prisma para acessar o banco SQLite

export default defineEventHandler(async (event) => {
  try {
    // 1️⃣ Extrai o parâmetro "id" da rota dinâmica /order/[id]
    const id = event.context.params.id

    // 2️⃣ Tenta buscar o pedido no banco de dados
    //    Primeiro procura pelo squareId (ID do pagamento Square)
    //    Caso não encontre, tenta pelo ID interno do Prisma (id autogerado)
    const order =
      (await prisma.order.findUnique({
        where: { squareId: id }, // procura usando o ID do pagamento Square
        include: { items: true }, // garante que os itens do pedido venham juntos
      })) ||
      (await prisma.order.findUnique({
        where: { id }, // procura pelo ID interno do Prisma (UUID gerado localmente)
        include: { items: true },
      }))

    // 3️⃣ Caso não encontre nenhum pedido, retorna erro amigável
    if (!order) {
      return { success: false, message: 'Order not found' }
    }

    // 4️⃣ Se encontrou, retorna o pedido completo
    //    O front usa este objeto para renderizar a tela de confirmação
    return { success: true, order }

  } catch (err) {
    // 5️⃣ Loga no console em caso de erro e responde com mensagem genérica
    console.error('Erro ao buscar pedido:', err)
    return { success: false, message: 'Internal server error' }
  }
})
