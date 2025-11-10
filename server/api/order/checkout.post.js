// ===============================================
// 🧾 Square Checkout Endpoint
// -----------------------------------------------
// Este endpoint é responsável por processar um pagamento real via Square,
// validar os preços direto no catálogo da Square, criar o pedido (order)
// para aparecer no dashboard, salvar no banco de dados via Prisma e enviar
// um e-mail de confirmação com QR code e resumo do pedido.
// ===============================================

import { getSquareConfig } from '../../utils/squareClient.js'          // 🔧 Configurações da API Square
import { sendOrderConfirmationEmail } from '../../utils/emailClient.js' // ✉️ Função que envia o e-mail de confirmação
import prisma from '../../utils/db.js'                                 // 🧱 Cliente Prisma (SQLite)
import { validateSquareItems } from '../../utils/validateSquareItems.js' // ✅ Valida itens direto no catálogo da Square

export default defineEventHandler(async (event) => {
  try {
    // 1️⃣ Lê o corpo da requisição enviada pelo frontend
    //    Contém sourceId (token do cartão), email e itens selecionados.
    const body = await readBody(event)
    const { sourceId, email, items } = body

    // 2️⃣ Verifica se os dados obrigatórios foram enviados
    if (!sourceId) {
      throw createError({ statusCode: 400, statusMessage: 'Missing sourceId' })
    }

    if (!items?.length) {
      return { success: false, message: 'Nenhum item informado no pedido.' }
    }

    // 3️⃣ Validação de segurança — ignora qualquer preço do frontend
    //    Chama a função que consulta a Square e retorna o preço real de cada item.
    const validation = await validateSquareItems(items)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    const { verifiedItems, verifiedTotal } = validation // verifiedTotal em centavos

    // 4️⃣ Pega as credenciais da Square (ambiente sandbox ou produção)
    const { baseUrl, token } = getSquareConfig()
    const isProd = process.env.NODE_ENV === 'production'

    const LOCATION_ID = isProd
      ? process.env.SQUARE_PRODUCTION_LOCATION_ID
      : process.env.SQUARE_SANDBOX_LOCATION_ID

    const SQUARE_VERSION = '2025-01-23' // 🔖 versão da API (mantida fixa para compatibilidade)

    // 5️⃣ Cria um pedido (Order) na Square
    //    Isso permite que o pedido apareça no dashboard e KDS (Kitchen Display System).
    const orderPayload = {
      order: {
        location_id: LOCATION_ID,
        line_items: verifiedItems.map((i) => {
          const line = {
            name: i.name,
            quantity: String(i.quantity), // precisa ser string segundo a Square API
            base_price_money: {
              amount: i.price_cents, // 💵 preço em centavos (ex: 1500 = $15.00)
              currency: 'USD',
            },
          }
          // Se o item tiver variationId, associa ao catálogo
          if (i.variationId) {
            line.catalog_object_id = i.variationId
          }
          return line
        }),
        // ⚙️ (Futuro) Aqui é possível adicionar taxas, descontos ou taxas de serviço
      },
      idempotency_key: crypto.randomUUID(), // garante que pedidos duplicados não sejam criados
    }

    const orderRes = await $fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    })

    const orderId = orderRes?.order?.id
    if (!orderId) {
      return { success: false, message: 'Falha ao criar pedido na Square.' }
    }

    // 6️⃣ Cria o pagamento real associado ao pedido criado
    //    O valor vem do cálculo validado direto na Square (verifiedTotal)
    const paymentRes = await $fetch(`${baseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: {
          amount: Math.round(verifiedTotal), // já é em centavos (ex: 2600 = $26.00)
          currency: 'USD',
        },
        order_id: orderId,        // 🔗 vincula o pagamento ao pedido
        location_id: LOCATION_ID, // localização usada na transação
      }),
    })

    const payment = paymentRes?.payment
    if (!payment || payment.status !== 'COMPLETED') {
      return { success: false, message: 'Pagamento não concluído', payment }
    }

    // 7️⃣ Salva o pedido no banco SQLite via Prisma
    //    Inclui informações principais e os itens do pedido.
    const savedOrder = await prisma.order.create({
      data: {
        email: email || null,
        totalAmount: Math.round(verifiedTotal), // guarda o valor total em centavos
        currency: payment.amount_money.currency,
        squareId: payment.id,     // ID do pagamento Square
        squareOrder: orderId,     // ID do pedido Square
        receiptUrl: payment.receipt_url || null,
        status: payment.status,   // normalmente "COMPLETED"
        items: {
          create: verifiedItems.map((i) => ({
            name: i.name,
            price: i.price_cents, // centavos
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true }, // inclui os itens na resposta para uso no e-mail
    })

    // 8️⃣ Envia o e-mail de confirmação (com QR code + resumo do pedido)
    if (email) {
      await sendOrderConfirmationEmail({
        to: email,
        orderId: payment.id, // usamos o ID do pagamento no link do QR
        pickupTime: '15 minutes',
        receiptUrl: payment.receipt_url || 'https://squareup.com/receipts',
        items: verifiedItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: (i.price_cents / 100).toFixed(2), // converte centavos → dólares
        })),
      })
    }

    // 9️⃣ Retorna resposta final para o frontend
    //    Inclui dados do pagamento, pedido salvo e se o e-mail foi enviado.
    return {
      success: true,
      message: 'Pagamento e pedido confirmados com sucesso!',
      order: savedOrder,
      payment,
      emailSent: !!email,
    }

  } catch (err) {
    // 🔴 Captura e loga erros (ex: falha na Square, DB, etc.)
    console.error('Erro ao processar pagamento:', err)

    // Se for erro da Square, retorna detalhes de forma amigável
    if (err?.data?.errors) {
      return {
        success: false,
        message: 'Erro na API Square',
        details: err.data.errors,
      }
    }

    // Retorno genérico para erros inesperados
    return {
      success: false,
      message: err?.statusMessage || 'Erro desconhecido no servidor',
      error: err,
    }
  }
})
