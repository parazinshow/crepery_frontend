import { getSquareConfig } from '../utils/squareClient.js'
import { sendOrderConfirmationEmail } from '../utils/emailClient.js'

export default defineEventHandler(async (event) => {
  try {

    // Lê o corpo da requisição
    // readBody é uma função utilitária do Nuxt 3 para ler o corpo da requisição
    const body = await readBody(event)
    const { sourceId, amount, email } = body

    if (!sourceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing sourceId',
      })
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        message: 'Valor inválido — cobrança não realizada.',
      }
    }

    const { baseUrl, token } = getSquareConfig()

    const paymentRes = await $fetch(`${baseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-01-23',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: {
          amount: amount,
          currency: 'USD',
        },
        location_id: process.env.SQUARE_SANDBOX_LOCATION_ID, //trocar para produção conforme necessário
      }),
    })

    // Enviar e-mail de confirmação (se o cliente informou e-mail)
    if (email) {
      await sendOrderConfirmationEmail({
        to: email,
        orderId: paymentRes.payment.id,
        pickupTime: '15 minutes', // Pode ser ajustado conforme a lógica do pedido
      })
    }

    return {
      success: true,
      payment: paymentRes.payment,
      emailSent: !!email,
    }
  } catch (err) {
    console.error('Erro ao processar pagamento:', err)

    // Tratamento específico para erros da API Square
    if (err?.data?.errors) {
      return {
        success: false,
        message: 'Erro na API Square',
        details: err.data.errors,
      }
    }

    return {
      success: false,
      message: err?.statusMessage || 'Erro desconhecido no servidor',
      error: err,
    }
  }
})
