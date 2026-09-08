import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { isOpen } from "@/lib/access";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const open = await prisma.decision.findMany({
    where: { status: { in: ["OPEN", "QUORUM_MET"] } },
    include: {
      invitations: true,
      ballots: true,
    },
  });

  let reminded = 0;
  for (const decision of open) {
    if (!isOpen(decision.status)) continue;
    const submitted = new Set(
      decision.ballots.filter((b) => b.submittedAt).map((b) => b.userId),
    );
    const pending = decision.invitations.filter(
      (i) => i.role === "VOTER" && !submitted.has(i.userId),
    );
    if (pending.length === 0) continue;

    const soon =
      decision.closesAt &&
      decision.closesAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

    if (!soon && pending.every((p) => p.remindedAt)) continue;

    await notify({
      userIds: pending.map((p) => p.userId),
      decisionId: decision.id,
      title: soon
        ? "24 hours left to vote"
        : "Reminder: your vote is outstanding",
      body: `${decision.title} still needs your ballot.`,
      href: `/decisions/${decision.id}/ballot`,
    });
    await prisma.invitation.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { remindedAt: new Date() },
    });
    reminded += pending.length;
  }

  return NextResponse.json({ ok: true, reminded });
}
