import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  try {
    const users = await prisma.user.count();
    return Response.json({ ok: true, hasDatabaseUrl, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { ok: false, hasDatabaseUrl, error: message },
      { status: 500 },
    );
  }
}
