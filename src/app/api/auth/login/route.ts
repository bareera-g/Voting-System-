import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { nextVotePath } from "@/lib/decisions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "")
      .trim()
      .replace(/\s+/g, " ");
    const nextRaw = String(body.next || "/");
    const next =
      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Enter your full name." },
        { status: 400 },
      );
    }

    const matches = await prisma.user.findMany({
      where: {
        name: { equals: name, mode: "insensitive" },
        role: { not: "VIEWER" },
      },
      take: 2,
    });
    if (matches.length !== 1) {
      return NextResponse.json(
        { error: "We couldn’t find that name on the voter list." },
        { status: 401 },
      );
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
    const destination = next.startsWith("/decisions/")
      ? next
      : await nextVotePath(user.id);
    return NextResponse.json({
      ok: true,
      name: user.name,
      role: user.role,
      next: destination,
    });
  } catch (error) {
    console.error("Name login failed", error);
    return NextResponse.json(
      { error: "Couldn’t reach the voter list. Try again in a minute." },
      { status: 500 },
    );
  }
}
