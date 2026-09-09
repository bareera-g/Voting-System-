import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageUser } from "@/lib/guard";
import { getDecisionChrome } from "@/lib/decisions";
import { canViewDecision } from "@/lib/access";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";

export default async function DecisionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const decision = await getDecisionChrome(id, user.id);
  if (!decision || !canViewDecision(user, decision, decision.invitations)) {
    notFound();
  }

  const open = await prisma.invitation.findMany({
    where: {
      userId: user.id,
      role: "VOTER",
      decision: { status: { in: ["OPEN", "QUORUM_MET"] } },
    },
    select: {
      decisionId: true,
      decision: { select: { streamOrder: true } },
    },
    orderBy: { decision: { streamOrder: "asc" } },
  });
  const index = open.findIndex((i) => i.decisionId === decision.id);

  return (
    <AppShell user={user} tab="vote">
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          Back
        </Link>
        {index >= 0 && open.length > 1 ? (
          <p className="text-sm text-muted">
            {index + 1} of {open.length}
          </p>
        ) : null}
      </div>
      <h1 className="serif mt-4 text-4xl leading-tight">{decision.title}</h1>
      <div className="mt-8">{children}</div>
    </AppShell>
  );
}
