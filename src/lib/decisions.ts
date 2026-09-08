import { prisma } from "./prisma";
import { computeResults } from "./scoring";

export const decisionInclude = {
  owner: true,
  facilitator: true,
  options: { orderBy: { sortOrder: "asc" as const } },
  criteria: { orderBy: { sortOrder: "asc" as const } },
  invitations: { include: { user: true }, orderBy: { createdAt: "asc" as const } },
  ballots: {
    include: {
      user: true,
      scores: true,
      ranks: true,
      reactions: true,
    },
  },
  outcome: { include: { owner: true, chosenOption: true } },
  auditEvents: {
    include: { user: true },
    orderBy: { createdAt: "desc" as const },
    take: 40,
  },
};

export async function getDecision(id: string) {
  return prisma.decision.findUnique({
    where: { id },
    include: decisionInclude,
  });
}

export type FullDecision = NonNullable<Awaited<ReturnType<typeof getDecision>>>;

export function resultsFor(decision: FullDecision) {
  const voterCount = decision.invitations.filter((i) => i.role === "VOTER").length;
  return computeResults({
    options: decision.options,
    criteria: decision.criteria,
    ballots: decision.ballots,
    voterCount,
    quorumPercent: decision.quorumPercent,
    ballotType: decision.ballotType,
  });
}

export async function nextVotePath(userId: string, exceptDecisionId?: string) {
  const invitations = await prisma.invitation.findMany({
    where: { userId, role: "VOTER" },
    include: {
      decision: { include: { ballots: true } },
    },
    orderBy: { decision: { streamOrder: "asc" } },
  });
  const next = invitations.find((i) => {
    if (exceptDecisionId && i.decisionId === exceptDecisionId) return false;
    const open = i.decision.status === "OPEN" || i.decision.status === "QUORUM_MET";
    if (!open) return false;
    return !i.decision.ballots.some((b) => b.userId === userId && b.submittedAt);
  });
  return next ? `/decisions/${next.decisionId}/ballot` : "/";
}

export async function refreshQuorum(decisionId: string) {
  const decision = await getDecision(decisionId);
  if (!decision) return null;
  if (decision.status !== "OPEN" && decision.status !== "QUORUM_MET") {
    return decision;
  }
  const results = resultsFor(decision);
  const next = results.quorumMet ? "QUORUM_MET" : "OPEN";
  if (next !== decision.status) {
    return prisma.decision.update({
      where: { id: decisionId },
      data: { status: next },
      include: decisionInclude,
    });
  }
  return decision;
}
