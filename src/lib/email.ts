import { Resend } from "resend";
import { formatNaira } from "./money";
import { orderPath } from "./order-link";
import { CONTACT_EMAIL, siteUrl } from "./site";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Yogurmac Foods <orders@yogurmacfoods.com>";

type Mail = { to: string; subject: string; html: string; text: string; idempotencyKey: string };

// Sends through Resend when configured; otherwise prints to the terminal.
async function send(mail: Mail): Promise<void> {
  if (!resend) {
    console.info(`\n[email:local] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  const { error } = await resend.emails.send(
    { from: FROM, replyTo: CONTACT_EMAIL, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text },
    { idempotencyKey: mail.idempotencyKey },
  );
  if (error) throw new Error(`Resend: ${error.message}`);
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F2EDE4;font-family:Arial,sans-serif;color:#1A1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #1A1917;padding-bottom:10px">Yogurmac Foods</div>
<h1 style="font-size:22px;text-transform:uppercase;margin:20px 0 12px">${title}</h1>
${body}
<p style="font-size:12px;color:#666;margin-top:28px;border-top:1px solid #C4BAA8;padding-top:12px">Yogurmac Foods Limited · Faith-driven · Lagos-made</p>
</div></body></html>`;
}

export type OrderEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  lga: string;
  exactAddress: string;
  landmark: string | null;
  subtotal: string;
  shippingFee: string;
  vatRate: string;
  vat: string;
  fulfilment: "DELIVERY" | "PICKUP";
  total: string;
  items: { productName: string; flavour: string; size: string; quantity: number; days: number; unitPrice: string }[];
};

export async function sendOrderConfirmation(o: OrderEmailData): Promise<void> {
  const lines = o.items.map(
    (i) => `${i.quantity} × ${i.productName} (${i.flavour}, ${i.size})${i.days > 1 ? `, one a day for ${i.days} days` : ""} — ${formatNaira(i.unitPrice)} each`,
  );
  const pickup = o.fulfilment === "PICKUP";
  const address = pickup ? o.exactAddress : `${o.exactAddress}${o.landmark ? ` (near ${o.landmark})` : ""}, ${o.lga}`;
  const where = pickup ? "Pick up from" : "Delivering to";
  const hasVat = Number(o.vat) > 0;
  const vatLabel = `VAT (${Number(o.vatRate)}%)`;
  const readyLine = pickup
    ? "Everything is made fresh to order. We will message you when your order is ready to collect."
    : "Everything is made fresh to order. We will message you when your order is on its way.";
  const orderUrl = `${siteUrl()}${orderPath(o.orderId)}`;
  const text = [
    `Hi ${o.customerName},`,
    ``,
    `Your order has been received. Your Order ID is ${o.orderId}.`,
    ``,
    ...lines,
    ``,
    `Subtotal: ${formatNaira(o.subtotal)}`,
    pickup ? `Pickup: free` : `Delivery: ${formatNaira(o.shippingFee)}`,
    ...(hasVat ? [`${vatLabel}: ${formatNaira(o.vat)}`] : []),
    `Total paid: ${formatNaira(o.total)}`,
    ``,
    `${where}: ${address}`,
    ``,
    readyLine,
    ``,
    `View your order: ${orderUrl}`,
  ].join("\n");

  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} × ${escape(i.productName)} <span style="color:#666">(${escape(i.flavour)}, ${escape(i.size)}${i.days > 1 ? `, one a day for ${i.days} days` : ""})</span></td><td style="text-align:right">${formatNaira(i.unitPrice)}</td></tr>`,
    )
    .join("");
  const html = layout(
    "Your order has been received",
    `<p>Hi ${escape(o.customerName)},</p>
<p>Your Order ID is <strong style="font-size:18px">${o.orderId}</strong>. Keep it for your records.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">${rows}
<tr><td style="padding-top:10px;border-top:1px solid #C4BAA8">Subtotal</td><td style="text-align:right;padding-top:10px;border-top:1px solid #C4BAA8">${formatNaira(o.subtotal)}</td></tr>
<tr><td>${pickup ? "Pickup" : "Delivery"}</td><td style="text-align:right">${pickup ? "Free" : formatNaira(o.shippingFee)}</td></tr>
${hasVat ? `<tr><td>${vatLabel}</td><td style="text-align:right">${formatNaira(o.vat)}</td></tr>` : ""}
<tr><td><strong>Total paid</strong></td><td style="text-align:right"><strong>${formatNaira(o.total)}</strong></td></tr></table>
<p><strong>${where}:</strong> ${escape(address)}</p>
<p>${readyLine}</p>
<p><a href="${escape(orderUrl)}" style="color:#1A1917;font-weight:bold">View your order</a></p>`,
  );

  await send({
    to: o.customerEmail,
    subject: `Order received — ${o.orderId}`,
    html,
    text,
    idempotencyKey: `order-confirmation-${o.orderId}`,
  });
}
