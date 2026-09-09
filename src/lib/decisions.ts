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

/** Lean load for casting a ballot — no board/audit payload. */
export async function getDecisionForBallot(id: string, userId: string) {
  return prisma.decision.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      brief: true,
      status: true,
      ownerId: true,
      facilitatorId: true,
      streamOrder: true,
      ballotType: true,
      options: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          caption: true,
          imageUrl: true,
          sortOrder: true,
        },
      },
      invitations: {
        where: { userId },
        select: { id: true, userId: true, role: true },
      },
      ballots: {
        where: { userId },
        select: {
          id: true,
          rationale: true,
          submittedAt: true,
          reactions: {
            select: { optionId: true, sentiment: true, improve: true },
          },
        },
        take: 1,
      },
    },
  });
}

/** Chrome for the ballot page — title/progress only. */
export async function getDecisionChrome(id: string, userId: string) {
  return prisma.decision.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      ownerId: true,
      facilitatorId: true,
      streamOrder: true,
      invitations: {
        where: { userId },
        select: { id: true, userId: true, role: true },
      },
    },
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
    where: {
      userId,
      role: "VOTER",
      decision: {
        status: { in: ["OPEN", "QUORUM_MET"] },
        ...(exceptDecisionId ? { id: { not: exceptDecisionId } } : {}),
      },
    },
    select: {
      decisionId: true,
      decision: {
        select: {
          id: true,
          streamOrder: true,
          ballots: {
            where: { userId, submittedAt: { not: null } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { decision: { streamOrder: "asc" } },
  });
  const next = invitations.find((i) => i.decision.ballots.length === 0);
  return next ? `/decisions/${next.decisionId}/ballot` : "/";
}

export async function refreshQuorum(decisionId: string) {
  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    select: {
      id: true,
      status: true,
      quorumPercent: true,
      invitations: {
        where: { role: "VOTER" },
        select: { id: true },
      },
      ballots: {
        where: { submittedAt: { not: null } },
        select: { id: true },
      },
    },
  });
  if (!decision) return null;
  if (decision.status !== "OPEN" && decision.status !== "QUORUM_MET") {
    return decision;
  }

  const voterCount = decision.invitations.length;
  const submittedCount = decision.ballots.length;
  const quorumMet =
    voterCount > 0 &&
    submittedCount / voterCount >= decision.quorumPercent / 100;
  const next = quorumMet ? "QUORUM_MET" : "OPEN";
  if (next !== decision.status) {
    return prisma.decision.update({
      where: { id: decisionId },
      data: { status: next },
      select: { id: true, status: true },
    });
  }
  return decision;
}
