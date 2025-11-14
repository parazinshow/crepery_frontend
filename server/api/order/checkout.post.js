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

// Cache path para ler a tax
import { promises as fs } from 'fs'
import path from 'path'
const CACHE_PATH = path.resolve('./server/cache/catalog.json')

export default defineEventHandler(async (event) => {
  try {
    // 1️⃣ Lê o corpo da requisição enviada pelo frontend
    //    Contém sourceId (token do cartão), email e itens selecionados.
    const body = await readBody(event)
    const { sourceId, email, items, tipAmount = 0, pickupTime } = body

    // Garante que tipAmount sempre será inteiro em centavos
    const tipCents = Math.max(0, Number(tipAmount) || 0)

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

    // 🕒 PICKUP: calcula mínimo e slots válidos com base nos verifiedItems
    const minPickupMinutes = await calculateMinPickupMinutes(verifiedItems)
    const validPickupSlots = generatePickupSlots(minPickupMinutes)

    // Se o front mandou um horário inválido → erro
    // Se não mandou nada → usamos o primeiro slot disponível
    let effectivePickupTime = pickupTime
    if (effectivePickupTime) {
      if (!validPickupSlots.includes(effectivePickupTime)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid pickup time selected',
        })
      }
    } else {
      effectivePickupTime = validPickupSlots[0]
    }

    // ✅ Pega o valor da taxa (em % → ex: 9.4)
    // Lê o cache antes de criar o pedido
    let cached = null
    let taxPercentage = 9.4 // valor padrão
    let taxName = 'Vail Sales Tax'

    try {
      const file = await fs.readFile(CACHE_PATH, 'utf8')
      cached = JSON.parse(file)
      if (cached?.data?.tax?.percentage) {
        taxPercentage = Number(cached.data.tax.percentage)
      }
      if (cached?.data?.tax?.name) {
        taxName = cached.data.tax.name
      }
    } catch (err) {
      console.warn('⚠️ Falha ao ler cache, usando valores padrão:', err)
    }

    // Cria um mapa apenas com os toppings (sweet e savory)
    const toppingMap = new Map()

    try {
      const toppingsSweet = cached?.data?.categories?.toppingsSweet || []
      const toppingsSavory = cached?.data?.categories?.toppingsSavory || []

      for (const t of [...toppingsSweet, ...toppingsSavory]) {
        const variation = t.variations?.[0]
        toppingMap.set(t.id, {
          name: t.name,
          price_cents: variation?.price_cents || 0,
          variationId: variation?.id || undefined,
        })
      }
    } catch (err) {
      console.warn('⚠️ Falha ao mapear toppings:', err)
    }

    // Soma o valor dos addons no total e cria line_items adicionais
    let addonsTotalCents = 0
    const addonLineItems = []

    for (const item of items) {
      const qty = Number(item.quantity || 1)

      for (const addon of item.addons || []) {
        let addonData = null

        if (typeof addon === 'object') {
          addonData = {
            id: addon.id,
            name: addon.label || addon.name || 'Addon',
            price_cents: addon.price_cents ?? toppingMap.get(addon.id)?.price_cents ?? 0,
          }
        } else {
          const cached = toppingMap.get(addon)
          addonData = {
            id: addon,
            name: cached?.name || 'Addon',
            price_cents: cached?.price_cents || 0,
          }
        }

        if (!addonData) continue

        // soma total
        if (addonData.price_cents) {
          addonsTotalCents += addonData.price_cents * qty
        }

        // adiciona como line_item separado no Square
        addonLineItems.push({
          name: `+ ${addonData.name}`,
          quantity: String(qty),
          base_price_money: {
            amount: addonData.price_cents,
            currency: 'USD',
          },
          catalog_object_id: toppingMap.get(addonData.id)?.variationId || undefined,
        })
      }
    }

    // 🧮 SUBTOTAL (itens + addons)
    const subtotalWithAddons = verifiedTotal + addonsTotalCents

    // TAX (somente sobre subtotal, SEM tip)
    const taxRate = taxPercentage / 100
    const taxAmount = Math.round(subtotalWithAddons * taxRate)

    // TOTAL BASE (subtotal + tax)
    const baseTotal = subtotalWithAddons + taxAmount

    // TOTAL FINAL (incluindo tip)
    const totalWithTax = baseTotal + tipCents

    // 4️⃣ Pega as credenciais da Square (ambiente sandbox ou produção)
    const { baseUrl, token } = getSquareConfig()
    const isProd = process.env.NODE_ENV === 'production'

    const LOCATION_ID = isProd
      ? process.env.SQUARE_PRODUCTION_LOCATION_ID
      : process.env.SQUARE_SANDBOX_LOCATION_ID

    const SQUARE_VERSION = '2025-01-23' // 🔖 versão da API (mantida fixa para compatibilidade)

    // 5️⃣ Cria um pedido (Order) na Square
    //    Inclui toppings como line_items separados (sem applied_money)
    //    Inclui special request como note no item principal
    items.forEach((item, idx) => {
      item.__index = idx
    })

    // After validating items, attach same index to verifiedItems
    verifiedItems.forEach((v, idx) => {
      v.__index = items[idx].__index
    })

    // Create base line items including special_request
    const baseLineItems = verifiedItems.map((v) => {
      const originalItem = items[v.__index]

      const lineItem = {
        name: v.name,
        quantity: String(v.quantity),
        base_price_money: {
          amount: v.price_cents,
          currency: 'USD',
        },
        catalog_object_id: v.variationId || undefined,
      }

      if (originalItem?.special_request?.trim()) {
        lineItem.note = originalItem.special_request.trim()
      }

      return lineItem
    })

    const orderPayload = {
      order: {
        location_id: LOCATION_ID,
        line_items: [...baseLineItems, ...addonLineItems],
        taxes: [
          {
            name: taxName,
            percentage: taxPercentage.toString(),
            scope: 'ORDER',
          },
        ],
      },
      idempotency_key: crypto.randomUUID(),
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
    //    O valor vem do cálculo validado direto na Square (verifiedTotal + addons)
    const orderTotal = orderRes?.order?.total_money?.amount

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

        // 💵 Valor final (subtotal + tax + tip)
        amount_money: {
          amount: orderTotal, // ❗ NÃO incluir tip aqui — Square recusa se somar
          currency: 'USD',
        },
        // 💰 Tip separado para a Square (opcional mas recomendado)
        tip_money: tipCents > 0 ? {
          amount: tipCents,
          currency: 'USD'
        } : undefined,
        order_id: orderId,        // 🔗 vincula o pagamento ao pedido
        location_id: LOCATION_ID, // localização usada na transação
      }),
    })

    const payment = paymentRes?.payment
    // Se o pagamento falhou ou foi negado
    if (!payment || payment.status !== 'COMPLETED') {
      //  Cancela a ordem criada anteriormente
      try {
        await $fetch(`${baseUrl}/v2/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: {
            'Square-Version': SQUARE_VERSION,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      } catch (cancelErr) {
        console.error('⚠️ Falha ao cancelar order não paga:', cancelErr)
      }

      return {
        success: false,
        message: 'Pagamento não aprovado.',
        payment,
      }
    }

    // gera número diário pro OrderNumber
    const { nextNumber, today } = await getDailyOrderNumber()

    // Prepara os itens para salvar no banco (adiciona specialRequest e addons completos como JSON)
    const enrichedItems = verifiedItems.map((v) => {
      // 🔗 Mesma lógica que usamos em baseLineItems:
      // v.__index aponta para o item original enviado do frontend
      const originalItem = items[v.__index]

      /**
       * ================================================================
       *  Mantemos os addons COMPLETOS no banco:
       *  - id
       *  - label
       *  - price_cents
       * 
       *  Isso garante que:
       *    ✔ /order/id mostre preço correto
       *    ✔ /admin mostre "+ Ham ($2.50)"
       *    ✔ email continue funcionando
       * ================================================================
       */
      const addonsClean = (originalItem?.addons || []).map((addon) => {
        // Caso addon venha como objeto completo do front
        if (typeof addon === "object") {
          return {
            id: addon.id,
            label: addon.label || addon.name || "Addon",
            price_cents: addon.price_cents ?? 0,
          }
        }

        // Caso addon venha só como ID → consultamos o toppingMap
        const t = toppingMap.get(addon)
        return {
          id: addon,
          label: t?.name || addon,
          price_cents: t?.price_cents || 0,
        }
      })

      return {
        name: v.name,
        price: v.price_cents,          // 💵 preço base em centavos
        quantity: v.quantity,
        
        // Salvamos a lista COMPLETA dos addons
        addons: addonsClean.length ? JSON.stringify(addonsClean) : null,

        specialRequest: originalItem?.special_request?.trim() || null,
      }
    })

    // 7️⃣ Salva o pedido no banco SQLite via Prisma
    //    Inclui informações principais e os itens do pedido.
    const savedOrder = await prisma.order.create({
      data: {
        email: email || null,
        totalAmount: totalWithTax, // total final com tip
        baseTotal: baseTotal,      // sem tip
        tipAmount: tipCents,       // valor da gorjeta
        currency: payment.amount_money.currency,
        squareId: payment.id,     // ID do pagamento Square
        squareOrder: orderId,     // ID do pedido Square
        receiptUrl: payment.receipt_url || null,
        status: payment.status,   // normalmente "COMPLETED"
        dailyNumber: nextNumber,
        dateKey: today,
        pickupTime: effectivePickupTime,
        items: {
          create: enrichedItems,
        },
      },
      include: { items: true }, // inclui os itens na resposta para uso no e-mail
    })

    // 8️⃣ Envia o e-mail de confirmação (com QR code + resumo do pedido)
    if (email) {
      // 🔹 Calcula o preço total de cada item com os toppings incluídos
      const emailItems = enrichedItems.map((i) => {
        const addonListRaw = i.addons ? JSON.parse(i.addons) : []

        // Agora addons SEMPRE são objetos completos → só copiamos
        const addonList = addonListRaw.map(a => ({
          name: a.label || a.name || "Addon",
          price_cents: a.price_cents ?? 0,
        }))

        // total base
        const baseCents = Number(i.price || 0)

        return {
          name: i.name,
          quantity: i.quantity,
          price_cents: baseCents,
          addons: addonList,                 // ← Agora sempre objetos
          special_request: i.specialRequest || null,
        }
      })


      // 🔹 Envia o e-mail com valores 100 % consistentes
      await sendOrderConfirmationEmail({
        to: email,
        orderId: payment.id, // ID usado no link do QR
        orderNumber: nextNumber,
        pickupTime: effectivePickupTime,
        receiptUrl: payment.receipt_url || 'https://squareup.com/receipts',
        items: emailItems,
        taxAmount,         // 💰 tax em centavos
        taxPercentage,     // ex: 9.4
        subtotal: subtotalWithAddons, // em centavos
        tipAmount: tipCents,
        total: totalWithTax, // em centavos
      })
    }

    // 9️⃣ Retorna resposta final para o frontend
    //    Inclui dados do pagamento, pedido salvo e se o e-mail foi enviado.
    return {
      success: true,
      message: 'Payment and order successfully confirmed!',
      order: savedOrder,
      payment,
      emailSent: !!email,
      taxPercentage,
      taxAmount,
      totalWithTax,
      tipAmount: tipCents,
      pickupTime: effectivePickupTime,
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
