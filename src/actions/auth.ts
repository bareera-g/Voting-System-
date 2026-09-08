"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, clearSession, verifyPassword } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { nextVotePath } from "@/lib/decisions";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Couldn’t sign you in." };
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    title: user.title,
    role: user.role as Role,
  });
  await audit("auth.login", { userId: user.id });
  if (next.startsWith("/decisions/")) {
    redirect(next);
  }
  redirect(await nextVotePath(user.id));
}

export async function logoutAction() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (user) await audit("auth.logout", { userId: user.id });
  await clearSession();
  redirect("/login");
}
