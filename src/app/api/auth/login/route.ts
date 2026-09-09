import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "")
    .trim()
    .replace(/\s+/g, " ");
  const matches = await prisma.user.findMany({
    where: {
      name: { equals: name, mode: "insensitive" },
      role: { not: "VIEWER" },
    },
    take: 2,
  });
  if (matches.length !== 1) {
    return NextResponse.json({ error: "Name not found" }, { status: 401 });
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
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
