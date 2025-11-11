// Importa dependências necessárias
import nodemailer from 'nodemailer' // 📧 Biblioteca usada para enviar e-mails
import QRCode from 'qrcode'         // 🔳 Biblioteca para gerar QR Codes em base64

// Função principal que envia o e-mail de confirmação de pedido
export async function sendOrderConfirmationEmail({ to, orderId, orderNumber,pickupTime, receiptUrl, items = [] }) {
  // 🚨 Garante que o e-mail de destino foi informado
  if (!to) throw new Error('Missing destination email address')

  // 🔗 Cria o link direto do pedido no site (será incluído no QR e no botão do e-mail)
  const orderUrl = `http://localhost:3000/order/${orderId}`

  // 🧾 Gera o QR Code em formato base64 que aponta para o link do pedido
  const qrCode = await QRCode.toDataURL(orderUrl)

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

  // 💳 Monta a seção de recibo Square, se disponível
  // Se o pedido estiver no sandbox, mostra aviso em vez do link
  const receiptSection = receiptUrl
    ? `<p><a href="${receiptUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:bold;">View Square receipt →</a></p>`
    : `<p style="color:#777;font-size:13px;">Receipt not available in sandbox mode.</p>`

  // 🧁 Monta a lista de itens do pedido
  // Cria uma <ul> com cada item em <li>, mostrando nome, quantidade e preço formatado
  // Se não houver itens, mostra um texto “No items found.”
const itemsHtml = items.length
  ? `<ul style="padding-left:15px;margin-top:10px;">${items
      .map((i) => {
        // tenta converter addons se for string JSON
        let addonsList = []
        try {
          if (Array.isArray(i.addons)) addonsList = i.addons
          else if (typeof i.addons === 'string' && i.addons.trim()) {
            addonsList = JSON.parse(i.addons)
          }
        } catch (e) {
          console.warn('Erro ao parsear addons no email:', e)
        }

        // gera HTML dos addons, se houver
        const addonsHtml =
          addonsList.length > 0
            ? `<div style="margin:2px 0 0 0; color:#555; font-size:13px;">
                ${addonsList.map((a) => `<div style="margin-left:18px;">+ ${a}</div>`).join('')}
              </div>`
            : ''

        // item principal com addons abaixo
        return `<li style="margin-bottom:8px;">
                  ${i.quantity} × ${i.name} — <b>$${Number(i.price).toFixed(2)}</b>
                  ${addonsHtml}
                </li>`
      })
      .join('')}</ul>`
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
