import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Yogurmac Foods <staff@yogurmacfoods.com>";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Sends through Resend when configured; otherwise prints to the terminal.
export async function sendInviteEmail(to: { name: string; email: string }, link: string): Promise<void> {
  const text = [
    `Hi ${to.name},`,
    ``,
    `You've been invited to the Yogurmac Foods staff portal.`,
    `Set your password here (the link works once and expires in 24 hours):`,
    ``,
    link,
  ].join("\n");
  if (!resend) {
    console.info(`\n[email:local] To: ${to.email}\nSubject: Your Yogurmac staff account\n\n${text}\n`);
    return;
  }
  const html = `<!doctype html><html><body style="margin:0;background:#F2EDE4;font-family:Arial,sans-serif;color:#1A1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #1A1917;padding-bottom:10px">Yogurmac Foods</div>
<p>Hi ${escape(to.name)},</p>
<p>You've been invited to the Yogurmac Foods staff portal. Set your password to get started. The link works once and expires in 24 hours.</p>
<p><a href="${escape(link)}" style="display:inline-block;background:#1A1917;color:#F2EDE4;padding:12px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase">Set my password</a></p>
<p style="font-size:12px;color:#666">If the button doesn't work, copy this link: ${escape(link)}</p>
</div></body></html>`;
  const { error } = await resend.emails.send({ from: FROM, to: to.email, subject: "Your Yogurmac staff account", html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
}
