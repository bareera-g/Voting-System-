"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function logoutAction() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (user) await audit("auth.logout", { userId: user.id });
  await clearSession();
  redirect("/login");
}
