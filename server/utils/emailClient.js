import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export async function sendOrderConfirmationEmail({ to, orderId, pickupTime }) {
  if (!to) throw new Error('Missing destination email address')

  // 🔹 Gera QR code com o link direto para o pedido
  //alterar production URL conforme necessário
  const orderUrl = `http://localhost:3000/order/${orderId}`
  const qrCode = await QRCode.toDataURL(orderUrl)

  // 🔹 Configura transporte SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  // 🔹 Corpo do e-mail (HTML formatado)
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color:#333;">
      <h2>🥞 The Crêpe Girl — Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Your order <b>#${orderId}</b> will be ready in <b>${pickupTime || '15 minutes'}</b>.</p>

      <p>Please show this QR code when picking up your order:</p>
      <img src="cid:qrcodeimg" alt="QR Code"
        style="width:180px;height:180px;margin-top:10px;border-radius:8px;"/>

      <p style="margin-top:20px;">
        Or click the link below to view your order details online:<br/>
        <a href="${orderUrl}"
           style="color:#2563eb;text-decoration:none;font-weight:bold;"
           target="_blank">
           View your order →
        </a>
      </p>

      <p style="margin-top:20px;">See you soon!<br><b>The Crêpe Girl Team</b></p>
    </div>
  `

  // 🔹 Envia o e-mail com o QR code embutido
  await transporter.sendMail({
    from: `"The Crêpe Girl" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order #${orderId} Confirmation`,
    html: htmlContent,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrCode.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcodeimg', // referência no <img src="cid:qrcodeimg">
      },
    ],
  })

  return { success: true }
}
