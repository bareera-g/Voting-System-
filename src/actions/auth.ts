"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, clearSession } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { nextVotePath } from "@/lib/decisions";

export async function loginAction(formData: FormData) {
  const name = String(formData.get("name") || "")
    .trim()
    .replace(/\s+/g, " ");
  const next = String(formData.get("next") || "/");

  if (name.length < 2 || name.length > 100) {
    return { error: "Enter your full name." };
  }

  const matches = await prisma.user.findMany({
    where: {
      name: { equals: name, mode: "insensitive" },
      role: { not: "VIEWER" },
    },
    take: 2,
  });
  if (matches.length !== 1) {
    return { error: "We couldn’t find that name on the voter list." };
  }
  const user = matches[0];

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
