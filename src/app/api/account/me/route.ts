import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer";

export const dynamic = "force-dynamic";

// Lets the cached header show "Sign in" or the customer's first name.
export async function GET() {
  const c = await getCustomer().catch(() => null);
  return NextResponse.json(c ? { signedIn: true, firstName: c.name.split(" ")[0] } : { signedIn: false }, { headers: { "Cache-Control": "no-store" } });
}
