// ===============================
//  📧 Resend Email Client
// ===============================
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { formatPickupTimeServer } from './time.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev'

// -------------------------------
// SEND ORDER CONFIRMATION EMAIL
// -------------------------------
export async function sendOrderConfirmationEmail({
  to,
  orderId,
  orderNumber,
  pickupTime,
  receiptUrl,
  items = [],
  taxAmount,
  taxPercentage,
  subtotal,
  tipAmount = 0,
  total
}) {
  if (!to) throw new Error("Missing destination email")

  const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
  const orderUrl = `${BASE_URL}/order/${orderId}`

  // Generate QR Code as base64 PNG
  const qrCodeDataUrl = await QRCode.toDataURL(orderUrl)
  const qrCodeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')

  const formattedPickupTime = formatPickupTimeServer(pickupTime)

  const receiptSection = receiptUrl
    ? `<p><a href="${receiptUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:bold;">View Square receipt →</a></p>`
    : `<p style="color:#777;font-size:13px;">Receipt not available in sandbox mode.</p>`


  // Build items HTML
  const itemsHtml = items.length
    ? (() => {
        let list = items.map((i) => {
          const addons = Array.isArray(i.addons)
            ? i.addons
            : (() => {
                try { return JSON.parse(i.addons || '[]') } catch { return [] }
              })()

          const base = Number(i.price_cents || i.price || 0)
          const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price_cents || a.price || 0), 0)
          const itemTotal = (base + addonsTotal) * Number(i.quantity)

          const addonsHtml = addons.length
            ? addons.map(a => {
                const label = a.label || a.name || a.id || "Addon"
                return `${label} ($${(Number(a.price_cents || 0) / 100).toFixed(2)})`
              }).join("<br>")
            : ""

          return `
            <li style="margin-bottom:8px;">
              ${i.quantity} × ${i.name} — <b>$${(itemTotal / 100).toFixed(2)}</b>
              ${addonsHtml ? `<br><span style="color:#555;">${addonsHtml}</span>` : ''}
              ${i.special_request ? `<br><span style="color:#777;"><b>Note:</b> ${i.special_request}</span>` : ''}
            </li>
          `
        }).join("")

        return `
          <ul style="padding-left:15px;margin-top:10px;">
            ${list}
          </ul>
          <p style="margin-top:14px;font-size:15px;">
            Subtotal: <b>$${(subtotal / 100).toFixed(2)}</b><br>
            Tax (${taxPercentage}%): <b>$${(taxAmount / 100).toFixed(2)}</b><br>
            Tip: <b>$${(tipAmount / 100).toFixed(2)}</b><br>
            Total: <b>$${(total / 100).toFixed(2)}</b>
          </p>
        `
      })()
    : "<p>No items found.</p>"


  // Full HTML
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color:#333;">
      <h2>🥞 The Crêpe Girl — Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Your order <b>#${orderNumber}</b> will be ready at <b>${formattedPickupTime}</b>.</p>

      <h3 style="margin-top:15px;">🧾 Order summary</h3>
      ${itemsHtml}

      <p style="margin-top:10px;">Show this QR code when picking up your order:</p>
      <img src="cid:qrcodeimg" style="width:180px;height:180px;margin-top:10px;border-radius:8px;"/>

      <p style="margin-top:20px;">
        <a href="${orderUrl}" style="color:#2563eb;text-decoration:none;font-weight:bold;">View your order →</a>
      </p>

      ${receiptSection}

      <p style="margin-top:20px;">See you soon!<br><b>The Crêpe Girl Team</b></p>
    </div>
  `


  // ========== SEND USING RESEND ==========
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Order #${orderNumber} Confirmation`,
    html: htmlContent,
    reply_to: process.env.REPLY_TO_EMAIL || 'thecrepegirl.orders@gmail.com',
    attachments: [
      {
        filename: "qrcode.png",
        content: qrCodeBase64,
        encoding: "base64",
        cid: "qrcodeimg" // used as cid in HTML
      }
    ]
  })
}



// ---------------------------------------
// SEND READY FOR PICKUP EMAIL
// ---------------------------------------
export async function sendPickupReadyEmail({ to, orderNumber, items }) {
  if (!to) throw new Error('Missing destination email')

  const itemsList = items.map(i => {
    const addons = i.addons ? JSON.parse(i.addons) : []

    const addonLines = addons.length
      ? addons.map(a => {
          const label = typeof a === "string" ? a : (a.label || a.name || a.id || "Addon")
          return `+ ${label}`
        }).join('<br>')
      : ''

    return `
      <li style="margin-bottom:6px;">
        ${i.quantity} × ${i.name}
        ${addonLines ? `<br><span style="color:#555;">${addonLines}</span>` : ''}
      </li>
    `
  }).join("")

  const html = `
    <h2>🥞 The Crêpe Girl</h2>
    <p>Your order <b>#${orderNumber}</b> is ready for pickup.</p>
    <p>🧾 <b>Order Summary</b></p>
    <ul style="padding-left:15px;margin-top:5px;">
      ${itemsList}
    </ul>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🥞 Your Order #${orderNumber} is Ready!`,
    html,
    reply_to: process.env.REPLY_TO_EMAIL || 'thecrepegirl.orders@gmail.com'
  })
}
