"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { canFacilitate, canVote, isOpen } from "@/lib/access";
import { getDecision, nextVotePath, refreshQuorum } from "@/lib/decisions";
import { getTemplate } from "@/lib/templates";

function revalidateDecision(id: string) {
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/decisions/${id}`);
  revalidatePath(`/decisions/${id}/compare`);
  revalidatePath(`/decisions/${id}/ballot`);
  revalidatePath(`/decisions/${id}/results`);
  revalidatePath(`/decisions/${id}/admin`);
  revalidatePath(`/decisions/${id}/export`);
}

export async function createDecisionAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { error: "Only facilitators can open a decision." };
  }

  const title = String(formData.get("title") || "").trim();
  const brief = String(formData.get("brief") || "").trim();
  const templateKey = String(formData.get("templateKey") || "CUSTOM");
  const ownerId = String(formData.get("ownerId") || user.id);
  const quorumPercent = Number(formData.get("quorumPercent") || 70);
  const windowHours = Number(formData.get("windowHours") || 72);
  const voterIds = formData.getAll("voterIds").map(String);
  const viewerIds = formData.getAll("viewerIds").map(String);

  const optionLabels = formData.getAll("optionLabel").map(String);
  const optionCaptions = formData.getAll("optionCaption").map(String);
  const optionJobs = formData.getAll("optionJobs").map(String);
  const optionImages = formData.getAll("optionImage").map(String);

  const criterionNames = formData.getAll("criterionName").map(String);
  const criterionDescriptions = formData.getAll("criterionDescription").map(String);
  const criterionWeights = formData.getAll("criterionWeight").map(String);

  if (!title) return { error: "A decision needs a title." };
  if (optionLabels.filter(Boolean).length < 1) {
    return { error: "Add at least one option." };
  }

  const template = getTemplate(templateKey);
  const ballotType = String(formData.get("ballotType") || "REACTION");
  const decision = await prisma.decision.create({
    data: {
      title,
      brief: brief || template.defaultBrief,
      status: "DRAFT",
      templateKey,
      ballotType: ballotType === "RUBRIC" ? "RUBRIC" : "REACTION",
      ownerId,
      facilitatorId: user.id,
      quorumPercent: Number.isFinite(quorumPercent) ? quorumPercent : 70,
      options: {
        create: optionLabels
          .map((label, i) => ({
            label: label.trim(),
            caption: (optionCaptions[i] || "").trim(),
            jobs: (optionJobs[i] || "").trim(),
            imageUrl: optionImages[i] || "/cards/calm-hierarchy.svg",
            sortOrder: i,
          }))
          .filter((o) => o.label),
      },
      criteria: {
        create: criterionNames
          .map((name, i) => ({
            name: name.trim(),
            description: (criterionDescriptions[i] || "").trim(),
            weight: Number(criterionWeights[i] || 1) || 1,
            sortOrder: i,
          }))
          .filter((c) => c.name),
      },
    },
  });

  const inviteIds = new Map<string, string>();
  for (const id of voterIds) inviteIds.set(id, "VOTER");
  for (const id of viewerIds) if (!inviteIds.has(id)) inviteIds.set(id, "VIEWER");
  if (!inviteIds.has(ownerId)) inviteIds.set(ownerId, "VOTER");
  if (!inviteIds.has(user.id)) inviteIds.set(user.id, "VOTER");

  await prisma.invitation.createMany({
    data: [...inviteIds.entries()].map(([userId, role]) => ({
      decisionId: decision.id,
      userId,
      role,
    })),
  });

  await audit("decision.created", {
    userId: user.id,
    decisionId: decision.id,
    metadata: { templateKey, windowHours },
  });

  // stash window hours on create via metadata; openDecision uses form or default
  await prisma.auditEvent.create({
    data: {
      action: "decision.window_hours",
      userId: user.id,
      decisionId: decision.id,
      metadata: JSON.stringify({ windowHours }),
    },
  });

  revalidateDecision(decision.id);
  redirect(`/decisions/${decision.id}/admin`);
}

export async function openDecisionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const windowHours = Number(formData.get("windowHours") || 72);
  const decision = await getDecision(id);
  if (!decision) return { error: "Decision not found." };
  if (!canFacilitate(user, decision)) return { error: "Not allowed." };
  if (decision.status !== "DRAFT" && decision.status !== "OPEN") {
    return { error: "This decision cannot be opened." };
  }

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + windowHours * 60 * 60 * 1000);

  await prisma.decision.update({
    where: { id },
    data: { status: "OPEN", opensAt, closesAt },
  });
  await audit("decision.opened", {
    userId: user.id,
    decisionId: id,
    metadata: { closesAt },
  });

  const voterIds = decision.invitations.map((i) => i.userId);
  await notify({
    userIds: voterIds,
    decisionId: id,
    title: "You have a decision",
    body: `${decision.title} is open. Vote before ${closesAt.toUTCString()}.`,
    href: `/decisions/${id}/ballot`,
  });

  revalidateDecision(id);
}

export async function extendDeadlineAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const hours = Number(formData.get("hours") || 24);
  const decision = await getDecision(id);
  if (!decision || !canFacilitate(user, decision)) return { error: "Not allowed." };
  if (!isOpen(decision.status)) return { error: "Only open decisions can be extended." };

  const base = decision.closesAt && decision.closesAt > new Date() ? decision.closesAt : new Date();
  const closesAt = new Date(base.getTime() + hours * 60 * 60 * 1000);
  await prisma.decision.update({ where: { id }, data: { closesAt } });
  await audit("decision.extended", {
    userId: user.id,
    decisionId: id,
    metadata: { closesAt, hours },
  });
  revalidateDecision(id);
}

export async function closeDecisionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const decision = await getDecision(id);
  if (!decision || !canFacilitate(user, decision)) return { error: "Not allowed." };
  if (!isOpen(decision.status)) return { error: "Already closed." };

  const refreshed = await refreshQuorum(id);
  if (!refreshed || refreshed.status !== "QUORUM_MET") {
    return { error: "Quorum is not met. Extend the window or wait for votes." };
  }

  await prisma.decision.update({ where: { id }, data: { status: "CLOSED" } });
  await audit("decision.closed", { userId: user.id, decisionId: id });
  await notify({
    userIds: decision.invitations.map((i) => i.userId),
    decisionId: id,
    title: "Decision closed",
    body: `${decision.title} is closed. Named results are visible. The owner should record the outcome.`,
    href: `/decisions/${id}/results`,
  });
  revalidateDecision(id);
}

export async function archiveDecisionAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const decision = await getDecision(id);
  if (!decision || !canFacilitate(user, decision)) return { error: "Not allowed." };
  if (decision.status !== "CLOSED") return { error: "Close the decision before archiving." };

  await prisma.decision.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit("decision.archived", { userId: user.id, decisionId: id });
  revalidateDecision(id);
}

export async function recordOutcomeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const type = String(formData.get("type") || "CHOSEN");
  const chosenOptionId = String(formData.get("chosenOptionId") || "") || null;
  const rationale = String(formData.get("rationale") || "").trim();
  const hybridNotes = String(formData.get("hybridNotes") || "").trim();
  const recommendedId = String(formData.get("recommendedId") || "");

  const decision = await getDecision(id);
  if (!decision) return { error: "Decision not found." };
  if (user.id !== decision.ownerId && user.role !== "ADMIN") {
    return { error: "Only the decision owner can record the outcome." };
  }
  if (decision.status !== "CLOSED" && decision.status !== "ARCHIVED") {
    return { error: "Close the vote before recording an outcome." };
  }
  if (!rationale) return { error: "A one-line rationale is required." };

  if (type === "REOPEN") {
    await prisma.$transaction([
      prisma.outcome.deleteMany({ where: { decisionId: id } }),
      prisma.decision.update({ where: { id }, data: { status: "OPEN" } }),
    ]);
    await audit("decision.reopened", {
      userId: user.id,
      decisionId: id,
      metadata: { rationale },
    });
    revalidateDecision(id);
    return;
  }

  if (type === "CHOSEN" && !chosenOptionId) {
    return { error: "Pick the chosen option." };
  }

  const isOverride = Boolean(
    type === "CHOSEN" && recommendedId && chosenOptionId && chosenOptionId !== recommendedId,
  );
  if (isOverride && rationale.length < 12) {
    return { error: "Overrides need a clear reason." };
  }

  await prisma.outcome.upsert({
    where: { decisionId: id },
    create: {
      decisionId: id,
      type,
      chosenOptionId,
      rationale,
      hybridNotes,
      isOverride,
      ownerId: user.id,
    },
    update: {
      type,
      chosenOptionId,
      rationale,
      hybridNotes,
      isOverride,
      ownerId: user.id,
    },
  });

  await audit("decision.outcome", {
    userId: user.id,
    decisionId: id,
    metadata: { type, chosenOptionId, isOverride },
  });

  revalidateDecision(id);
}

export async function submitBallotAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const rationale = String(formData.get("rationale") || "").trim();
  const decision = await getDecision(id);
  if (!decision) return { error: "Decision not found." };
  if (!canVote(user, decision, decision.invitations)) {
    return { error: "You are not a voter on this open decision." };
  }

  if (decision.ballotType !== "RUBRIC") {
    const reactions: { optionId: string; sentiment: string; improve: string }[] = [];
    for (const option of decision.options) {
      const sentiment = String(formData.get(`sentiment:${option.id}`) || "");
      if (sentiment !== "LIKE" && sentiment !== "DISLIKE") {
        return { error: "Mark like or don’t like on every option." };
      }
      reactions.push({
        optionId: option.id,
        sentiment,
        improve: String(formData.get(`improve:${option.id}`) || "").trim(),
      });
    }

    const existing = await prisma.ballot.findUnique({
      where: { decisionId_userId: { decisionId: id, userId: user.id } },
    });
    const ballot = existing
      ? await prisma.ballot.update({
          where: { id: existing.id },
          data: { rationale, submittedAt: new Date() },
        })
      : await prisma.ballot.create({
          data: {
            decisionId: id,
            userId: user.id,
            rationale,
            submittedAt: new Date(),
          },
        });

    await prisma.ballotReaction.deleteMany({ where: { ballotId: ballot.id } });
    await prisma.ballotReaction.createMany({
      data: reactions.map((r) => ({ ...r, ballotId: ballot.id })),
    });
    await audit(existing ? "ballot.updated" : "ballot.submitted", {
      userId: user.id,
      decisionId: id,
    });
    await refreshQuorum(id);
    revalidateDecision(id);
    redirect(await nextVotePath(user.id, id));
  }

  if (!rationale) return { error: "One sentence on your top-ranked option is required." };

  const scores: { optionId: string; criterionId: string; score: number }[] = [];
  for (const option of decision.options) {
    for (const criterion of decision.criteria) {
      const raw = formData.get(`score:${option.id}:${criterion.id}`);
      const score = Number(raw);
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return { error: "Score every option on every criterion (1–5)." };
      }
      scores.push({ optionId: option.id, criterionId: criterion.id, score });
    }
  }

  const ranks = decision.options.map((option) => {
    const rank = Number(formData.get(`rank:${option.id}`));
    return { optionId: option.id, rank };
  });
  const rankValues = ranks.map((r) => r.rank).sort((a, b) => a - b);
  const expected = decision.options.map((_, i) => i + 1);
  if (rankValues.join() !== expected.join()) {
    return { error: "Forced rank every option. Ranks must be unique." };
  }

  const existing = await prisma.ballot.findUnique({
    where: { decisionId_userId: { decisionId: id, userId: user.id } },
  });
  const ballot = existing
    ? await prisma.ballot.update({
        where: { id: existing.id },
        data: { rationale, submittedAt: new Date() },
      })
    : await prisma.ballot.create({
        data: {
          decisionId: id,
          userId: user.id,
          rationale,
          submittedAt: new Date(),
        },
      });

  await prisma.ballotScore.deleteMany({ where: { ballotId: ballot.id } });
  await prisma.ballotRank.deleteMany({ where: { ballotId: ballot.id } });
  await prisma.ballotScore.createMany({
    data: scores.map((s) => ({ ...s, ballotId: ballot.id })),
  });
  await prisma.ballotRank.createMany({
    data: ranks.map((r) => ({ ...r, ballotId: ballot.id })),
  });

  await audit(existing ? "ballot.updated" : "ballot.submitted", {
    userId: user.id,
    decisionId: id,
  });

  await refreshQuorum(id);
  revalidateDecision(id);
  redirect(await nextVotePath(user.id, id));
}

export async function sendRemindersAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const decision = await getDecision(id);
  if (!decision || !canFacilitate(user, decision)) return { error: "Not allowed." };
  if (!isOpen(decision.status)) return { error: "Decision is not open." };

  const submitted = new Set(
    decision.ballots.filter((b) => b.submittedAt).map((b) => b.userId),
  );
  const pending = decision.invitations.filter(
    (i) => i.role === "VOTER" && !submitted.has(i.userId),
  );
  if (pending.length === 0) return { error: "Everyone has voted." };

  await notify({
    userIds: pending.map((p) => p.userId),
    decisionId: id,
    title: "Reminder: your vote is outstanding",
    body: `${decision.title} still needs your ballot before the window closes.`,
    href: `/decisions/${id}/ballot`,
  });

  await prisma.invitation.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: { remindedAt: new Date() },
  });
  await audit("decision.reminded", {
    userId: user.id,
    decisionId: id,
    metadata: { count: pending.length },
  });
  revalidateDecision(id);
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}
