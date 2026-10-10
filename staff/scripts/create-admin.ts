// Creates the business owner's account and prints a one-time link to set the
// password. Run once per environment:
//   npx tsx --env-file=.env scripts/create-admin.ts "Full Name" owner@example.com
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { inviteUrl, newInviteToken } from "../src/lib/invite";

const [name, rawEmail] = process.argv.slice(2);
if (!name || !rawEmail?.includes("@")) {
  console.error('Usage: npx tsx --env-file=.env scripts/create-admin.ts "Full Name" owner@example.com');
  process.exit(1);
}
const email = rawEmail.toLowerCase();
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });

const existing = await db.user.findUnique({ where: { email } });
if (existing?.isActive) {
  console.error(`${email} already has an active account.`);
  process.exit(1);
}
const { token, hash, expiry } = newInviteToken();
const user = existing
  ? await db.user.update({ where: { id: existing.id }, data: { name, role: "ADMIN", inviteTokenHash: hash, inviteExpiry: expiry } })
  : await db.user.create({ data: { name, email, role: "ADMIN", isActive: false, inviteTokenHash: hash, inviteExpiry: expiry } });
await db.auditLog.create({ data: { action: "ADMIN_INVITED", entityType: "User", entityId: user.id, newValue: { email } } });
console.log(`\nAdmin account for ${email}. Open this link within 24 hours to set the password:\n\n${inviteUrl(token)}\n`);
console.log("Then, in the Neon Console → Auth → Users, choose “Make admin” for this user so they can reset staff logins.\n");
await db.$disconnect();
