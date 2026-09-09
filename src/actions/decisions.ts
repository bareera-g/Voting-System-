"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canVote } from "@/lib/access";
import { getDecision, nextVotePath, refreshQuorum } from "@/lib/decisions";

function revalidateDecision(id: string) {
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/decisions/${id}/ballot`);
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
  if (existing?.submittedAt) {
    return { error: "You already voted on this one." };
  }
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
