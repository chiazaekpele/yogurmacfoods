import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user?.isActive ? homeFor(user.role) : "/login");
}
