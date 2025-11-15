import QRCode from "qrcode";
import SibApiV3Sdk from "@sendinblue/client";
import { formatPickupTimeServer } from "./time.js";

// ========================================================
// CONFIG BREVO (API HTTP v3)
// ========================================================
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Usa a API KEY do Brevo (não é SMTP key)
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

console.log("🔥 BREVO KEY PREFIX:", (process.env.BREVO_API_KEY || '').slice(0, 7))

// Função auxiliar para enviar de fato o e-mail usando Brevo API
async function sendBrevoEmail({ to, subject, html, attachments = [] }) {
  const senderEmail = process.env.EMAIL_FROM || "noreply@thecrepegirl.com";

  const payload = {
    sender: {
      name: "The Crêpe Girl",
      email: senderEmail
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  // Se algum dia você quiser mandar anexo "de verdade"
  if (attachments.length) {
    payload.attachment = attachments.map(a => ({
      name: a.filename,
      content: a.content, // base64
    }));
  }

  return apiInstance.sendTransacEmail(payload);
}

// ========================================================
// ✉️ Order Confirmation Email
// ========================================================
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
  if (!to) throw new Error("Missing destination email address");

  const BASE_URL =
    process.env.PUBLIC_BASE_URL || "http://localhost:3000";

  const orderUrl = `${BASE_URL}/order/${orderId}`;

  // QR CODE (base64)
  const qrCode = await QRCode.toDataURL(orderUrl);

  const formattedPickupTime = formatPickupTimeServer(pickupTime);

  const receiptSection = receiptUrl
    ? `<p><a href="${receiptUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:bold;">View Square receipt →</a></p>`
    : `<p style="color:#777;font-size:13px;">Receipt not available in sandbox mode.</p>`;

  // === MESMA LÓGICA QUE VOCÊ TINHA PARA LISTAR ITENS ===
  const itemsHtml = items.length
    ? (() => {
        let totalCents = 0;

        const listHtml = items
          .map(i => {
            const addons = Array.isArray(i.addons)
              ? i.addons
              : (() => {
                  try {
                    return JSON.parse(i.addons || "[]");
                  } catch {
                    return [];
                  }
                })();

            const basePriceCents = Number(i.price_cents || i.price || 0);

            const addonsTotalCents = addons.reduce((sum, a) => {
              const addonPriceCents = Number(a?.price_cents || a?.price || 0);
              return sum + addonPriceCents;
            }, 0);

            const itemTotalCents =
              (basePriceCents + addonsTotalCents) *
              (Number(i.quantity) || 1);

            totalCents += itemTotalCents;

            const addonsHtml = addons.length
              ? addons
                  .map(a => {
                    if (typeof a === "string") return a;

                    const label =
                      a.label || a.name || a.id || "Addon";
                    const cents = Number(a.price_cents || a.price || 0);

                    return `${label} ($${(cents / 100).toFixed(2)})`;
                  })
                  .join("<br>")
              : "";

            return `<li style="margin-bottom:8px;">
              ${i.quantity} × ${i.name} — <b>$${(
              itemTotalCents / 100
            ).toFixed(2)}</b>
              ${
                addonsHtml
                  ? `<br><span style="color:#555;">${addonsHtml}</span>`
                  : ""
              }
              ${
                i.special_request
                  ? `<br><span style="color:#777;"><b>Note:</b> ${i.special_request}</span>`
                  : ""
              }
            </li>`;
          })
          .join("");

        const subtotalDollars = (subtotal / 100).toFixed(2);
        const taxDollars = (taxAmount / 100).toFixed(2);
        const totalDollars = (total / 100).toFixed(2);

        const totalsHtml = `
          <p style="margin-top:14px;font-size:15px;">
            Subtotal: <b>$${subtotalDollars}</b><br>
            Tax (${taxPercentage}%): <b>$${taxDollars}</b><br>
            Tip: <b>$${(tipAmount / 100).toFixed(2)}</b><br>
            Total: <b>$${totalDollars}</b>
          </p>
        `;

        return `
          <ul style="padding-left:15px;margin-top:10px;">
            ${listHtml}
          </ul>
          ${totalsHtml}
        `;
      })()
    : `<p>No items found.</p>`;

  // === HTML FINAL ===
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color:#333;">
      <h2>🥞 The Crêpe Girl — Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Your order <b>#${orderNumber}</b> will be ready at <b>${formattedPickupTime}</b>.</p>

      <h3 style="margin-top:15px;">🧾 Order summary</h3>
      ${itemsHtml}

      <p style="margin-top:10px;">Please show this QR code when picking up your order:</p>
      <img src="${qrCode}" alt="QR Code"
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
  `;

  // === ENVIA VIA BREVO API ===
  await sendBrevoEmail({
    to,
    subject: `Order #${orderNumber} Confirmation`,
    html: htmlContent,
    attachments: [] // QR já vai inline no src
  });
}

// ========================================================
// ✉️ Order Ready Email
// ========================================================
export async function sendPickupReadyEmail({ to, orderNumber, items }) {
  const itemsList = items
    .map(i => {
      const addons = i.addons ? JSON.parse(i.addons) : [];
      const addonLines = addons.length
        ? addons
            .map(a => {
              const label =
                typeof a === "string"
                  ? a
                  : a.label || a.name || a.id || "Addon";
              return `+ ${label}`;
            })
            .join("<br>")
        : "";

      return `
        <li style="margin-bottom:6px;">
          ${i.quantity} × ${i.name}
          ${
            addonLines
              ? `<br><span style="color:#555;">${addonLines}</span>`
              : ""
          }
        </li>
      `;
    })
    .join("");

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
  `;

  await sendBrevoEmail({
    to,
    subject: `🥞 The Crêpe Girl — Your Order #${orderNumber} is Ready!`,
    html
  });
}
