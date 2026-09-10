import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { nextVotePath } from "@/lib/decisions";
import { findOrCreateVoterByName } from "@/lib/name-login";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }

    const user = await findOrCreateVoterByName(name);
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      title: user.title,
      role: user.role as Role,
    });
    await audit("auth.login", { userId: user.id });

    let destination = "/";
    try {
      destination = next.startsWith("/decisions/")
        ? next
        : await nextVotePath(user.id);
    } catch (error) {
      console.error("nextVotePath failed", error);
      destination = "/";
    }

    return NextResponse.json({
      ok: true,
      name: user.name,
      role: user.role,
      next: destination,
    });
  } catch (error) {
    console.error("Name login failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Couldn’t sign you in. Try again in a minute.",
        detail: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 },
    );
  }
}
