import { Resend } from "resend";
import { formatNaira } from "./money";

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
    { from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text },
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
  total: string;
  items: { productName: string; flavour: string; size: string; quantity: number; unitPrice: string }[];
};

export async function sendOrderConfirmation(o: OrderEmailData): Promise<void> {
  const lines = o.items.map(
    (i) => `${i.quantity} × ${i.productName} (${i.flavour}, ${i.size}) — ${formatNaira(i.unitPrice)} each`,
  );
  const address = `${o.exactAddress}${o.landmark ? ` (near ${o.landmark})` : ""}, ${o.lga}`;
  const text = [
    `Hi ${o.customerName},`,
    ``,
    `Your order has been received. Your Order ID is ${o.orderId}.`,
    ``,
    ...lines,
    ``,
    `Subtotal: ${formatNaira(o.subtotal)}`,
    `Delivery: ${formatNaira(o.shippingFee)}`,
    `Total paid: ${formatNaira(o.total)}`,
    ``,
    `Delivering to: ${address}`,
    ``,
    `Everything is made fresh to order. Your order will be ready in 2–3 business days, and we will message you when it is on its way.`,
  ].join("\n");

  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} × ${escape(i.productName)} <span style="color:#666">(${escape(i.flavour)}, ${escape(i.size)})</span></td><td style="text-align:right">${formatNaira(i.unitPrice)}</td></tr>`,
    )
    .join("");
  const html = layout(
    "Your order has been received",
    `<p>Hi ${escape(o.customerName)},</p>
<p>Your Order ID is <strong style="font-size:18px">${o.orderId}</strong>. Keep it for your records.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">${rows}
<tr><td style="padding-top:10px;border-top:1px solid #C4BAA8">Subtotal</td><td style="text-align:right;padding-top:10px;border-top:1px solid #C4BAA8">${formatNaira(o.subtotal)}</td></tr>
<tr><td>Delivery</td><td style="text-align:right">${formatNaira(o.shippingFee)}</td></tr>
<tr><td><strong>Total paid</strong></td><td style="text-align:right"><strong>${formatNaira(o.total)}</strong></td></tr></table>
<p><strong>Delivering to:</strong> ${escape(address)}</p>
<p>Everything is made fresh to order. Your order will be ready in 2–3 business days, and we will message you when it is on its way.</p>`,
  );

  await send({
    to: o.customerEmail,
    subject: `Order received — ${o.orderId}`,
    html,
    text,
    idempotencyKey: `order-confirmation-${o.orderId}`,
  });
}

export async function sendSubscriptionThanks(s: {
  subscriptionCode: string;
  subscriberName: string;
  subscriberEmail: string;
  tierName: string;
  monthlyAmount: string;
}): Promise<void> {
  const text = [
    `Hi ${s.subscriberName},`,
    ``,
    `Thank you for becoming a ${s.tierName} with a monthly gift of ${formatNaira(s.monthlyAmount)}.`,
    `Every naira of your partnership funds the Ythirst Community Project and its outreach to children across Lagos.`,
    ``,
    `Paystack will charge your card monthly. You can cancel at any time from the link in your Paystack receipt.`,
  ].join("\n");
  const html = layout(
    "Thank you, partner",
    `<p>Hi ${escape(s.subscriberName)},</p>
<p>Thank you for becoming a <strong>${escape(s.tierName)}</strong> with a monthly gift of <strong>${formatNaira(s.monthlyAmount)}</strong>.</p>
<p>Every naira of your partnership funds the Ythirst Community Project and its outreach to children across Lagos.</p>
<p style="font-size:13px;color:#555">Paystack will charge your card monthly. You can cancel at any time from the link in your Paystack receipt.</p>`,
  );
  await send({
    to: s.subscriberEmail,
    subject: `Thank you for partnering with Yogurmac`,
    html,
    text,
    idempotencyKey: `subscription-thanks-${s.subscriptionCode}`,
  });
}
