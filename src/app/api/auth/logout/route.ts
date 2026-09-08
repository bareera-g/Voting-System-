import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) await audit("auth.logout", { userId: user.id });
  await clearSession();
  return NextResponse.json({ ok: true });
}
