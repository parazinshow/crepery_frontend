// Importa dependências necessárias
import nodemailer from 'nodemailer' // 📧 Biblioteca usada para enviar e-mails
import QRCode from 'qrcode'         // 🔳 Biblioteca para gerar QR Codes em base64

// ========================================================
// ✉️ E-mail: Order Confirmation
// --------------------------------------------------------
// Função principal que envia o e-mail de confirmação de pedido
// ========================================================


  // ✉️ Configura o transporte SMTP para envio de e-mail
  // Aqui usa variáveis de ambiente (EMAIL_USER, EMAIL_PASS, etc.)
  // Caso o usuário use Gmail, as configs padrão já funcionam
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: false, // true = usa SSL (porta 465), false = STARTTLS (porta 587)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

export async function sendOrderConfirmationEmail({ to, orderId, orderNumber,pickupTime, receiptUrl, items = [], taxAmount
  ,taxPercentage,subtotal, tipAmount = 0,total }) {
  // 🚨 Garante que o e-mail de destino foi informado
  if (!to) throw new Error('Missing destination email address')

  // 🔗 Cria o link direto do pedido no site (será incluído no QR e no botão do e-mail)
  const orderUrl = `http://localhost:3000/order/${orderId}`

  // 🧾 Gera o QR Code em formato base64 que aponta para o link do pedido
  const qrCode = await QRCode.toDataURL(orderUrl)

  // 💳 Monta a seção de recibo Square, se disponível
  // Se o pedido estiver no sandbox, mostra aviso em vez do link
  const receiptSection = receiptUrl
    ? `<p><a href="${receiptUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:bold;">View Square receipt →</a></p>`
    : `<p style="color:#777;font-size:13px;">Receipt not available in sandbox mode.</p>`

  // 🧁 Monta a lista de itens do pedido
  // Cria uma <ul> com cada item em <li>, mostrando nome, quantidade e preço formatado
  // Se não houver itens, mostra um texto “No items found.”
const itemsHtml = items.length
  ? (() => {
      let totalCents = 0

      const listHtml = items
        .map((i) => {
          const addons = Array.isArray(i.addons)
            ? i.addons
            : (() => {
                try { return JSON.parse(i.addons || '[]') } catch { return [] }
              })()

          // ✅ Sempre tratar como centavos (mantendo consistência com o backend e DB)
          const basePriceCents = Number(i.price_cents || i.price || 0)

          // Soma o preço dos toppings (também em centavos)
          const addonsTotalCents = addons.reduce((sum, a) => {
            const addonPriceCents = Number(a?.price_cents || a?.price || 0)
            return sum + addonPriceCents
          }, 0)

          // Valor total do item (base + addons) × quantidade
          const itemTotalCents =
            (basePriceCents + addonsTotalCents) * (Number(i.quantity) || 1)

          totalCents += itemTotalCents

          // Gera HTML dos toppings
          const addonsHtml = addons.length
            ? addons
                .map((a) => {
                  const label = a.label || a.name || a.id
                  const cents = Number(a.price_cents || a.price || 0)
                  return `${label} ($${(cents / 100).toFixed(2)})`
                })
                .join('<br>')
            : ''

          // Renderiza a linha do item
          return `<li style="margin-bottom:8px;">
            ${i.quantity} × ${i.name} — <b>$${(itemTotalCents / 100).toFixed(2)}</b>
            ${addonsHtml ? `<br><span style="color:#555;">${addonsHtml}</span>` : ''}
            ${i.special_request ? `<br><span style="color:#777;"><b>Note:</b> ${i.special_request}</span>` : ''}
          </li>`
        })
        .join('')

      // =====================================================================
      // 🔵 Cálculo dos valores monetários mostrados abaixo
      // ---------------------------------------------------------------------
      // Aqui estamos formatando:
      // - Subtotal (base + addons)
      // - Tax (em centavos → dólar)
      // - Total final (subtotal + tax)
      //
      // Estes valores já devem ser recebidos na função de email como:
      //   subtotal (centavos)
      //   taxAmount (centavos)
      //   taxPercentage (ex: 9.4)
      //   total (centavos)
      // =====================================================================

      const subtotalDollars = (subtotal / 100).toFixed(2)
      const taxDollars = (taxAmount / 100).toFixed(2)
      const totalDollars = (total / 100).toFixed(2)

      // ===============================================
      // 🧾 Seção de resumo (subtotal + tax + total final)
      // ===============================================
      const totalsHtml = `
        <p style="margin-top:14px;font-size:15px;">
          Subtotal: <b>$${subtotalDollars}</b><br>
          Tax (${taxPercentage}%): <b>$${taxDollars}</b><br>
          Tip: <b>$${(tipAmount / 100).toFixed(2)}</b><br>
          Total: <b>$${totalDollars}</b>
        </p>
      `

      // ===============================================
      // 🔄 Retorno final da lista de itens + resumo
      // ===============================================
      return `
        <ul style="padding-left:15px;margin-top:10px;">
          ${listHtml}
        </ul>
        ${totalsHtml}
      `
    })()
  : `<p>No items found.</p>`


  // 🧠 Monta o corpo HTML completo do e-mail
  // Inclui título, mensagem de agradecimento, tempo de preparo, lista de itens,
  // QR Code embutido (com CID), botão para visualizar o pedido e recibo opcional
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color:#333;">
      <h2>🥞 The Crêpe Girl — Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Your order <b>#${orderNumber}</b> will be ready in <b>${pickupTime || '15 minutes'}</b>.</p>

      <h3 style="margin-top:15px;">🧾 Order summary</h3>
      ${itemsHtml}

      <p style="margin-top:10px;">Please show this QR code when picking up your order:</p>
      <img src="cid:qrcodeimg" alt="QR Code"
        style="width:180px;height:180px;margin-top:10px;border-radius:8px;"/>

      <p style="margin-top:20px;">
        Or click below to view your order online:<br/>
        <a href="${orderUrl}"
           style="color:#2563eb;text-decoration:none;font-weight:bold;"
           target="_blank">
           View your order →
        </a>
      </p>

      ${receiptSection}

      <p style="margin-top:20px;">See you soon!<br><b>The Crêpe Girl Team</b></p>
    </div>
  `

  // 🚀 Envia o e-mail com o conteúdo montado e o QR Code embutido
  // O QR é enviado como attachment base64 com um CID (Content ID)
  // Isso permite referenciá-lo dentro do HTML como <img src="cid:qrcodeimg">
  await transporter.sendMail({
    from: `"The Crêpe Girl" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order #${orderNumber} Confirmation`,
    html: htmlContent,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrCode.split('base64,')[1], // remove prefixo data:image/png;base64,
        encoding: 'base64',
        cid: 'qrcodeimg', // usado no HTML do e-mail para exibir a imagem inline
      },
    ],
  })
}

// ========================================================
// ✉️ E-mail: Order Ready for Pickup
// --------------------------------------------------------
// Enviado quando o admin marca o pedido como DONE
// ========================================================

export async function sendPickupReadyEmail({ to, orderNumber, items }) {
  // 🧾 Lista simples dos itens no email
const itemsList = items
  .map(i => {
    const addons = i.addons ? JSON.parse(i.addons) : []

    // 👉 Correção: extrair label, name ou id
    const addonLines = addons.length
      ? addons
          .map(a => {
            const label =
              typeof a === "string"
                ? a
                : a.label || a.name || a.id || "Addon"

            return `+ ${label}`
          })
          .join('<br>')
      : ''

    return `
      <li style="margin-bottom:6px;">
        ${i.quantity} × ${i.name}
        ${addonLines ? `<br><span style="color:#555;">${addonLines}</span>` : ''}
      </li>
    `
  })
  .join('')

  // ✉️ Título do e-mail
  const subject = `🥞 The Crêpe Girl — Your Order #${orderNumber} is Ready!`

  // ✉️ Corpo do e-mail
  const html = `
    <h2>🥞 The Crêpe Girl</h2>
    <p>Hi there!</p>

    <p>Your order <b>#${orderNumber}</b> is now ready for pickup.</p>

    <p>🧾 <b>Order Summary</b></p>
    <ul style="padding-left:15px;margin-top:5px;">
      ${itemsList}
    </ul>

    <p>You may come to the pickup window now.  
    Thank you again for choosing The Crêpe Girl — enjoy your treat! 💛</p>
  `

  // 🚀 Envia o e-mail usando o transporter
  await transporter.sendMail({
    from: `"The Crêpe Girl" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  })
}
