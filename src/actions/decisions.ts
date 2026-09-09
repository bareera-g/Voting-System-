"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canVote } from "@/lib/access";
import { nextVotePath, refreshQuorum } from "@/lib/decisions";

const MAX_IMAGE_CHARS = 2_100_000; // ~1.5MB binary as base64 data URL

function revalidateDecision(id: string) {
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/decisions/${id}/ballot`);
}

function isValidImageUrl(value: string) {
  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

export async function createVoteAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "").trim();
  const brief = String(formData.get("brief") || "").trim();
  const voteType = String(formData.get("voteType") || "").trim();
  const labels = formData.getAll("optionLabel").map((v) => String(v).trim());
  const captions = formData.getAll("optionCaption").map((v) => String(v).trim());
  const images = formData.getAll("optionImage").map((v) => String(v).trim());

  if (voteType !== "TEXT" && voteType !== "IMAGE") {
    return { error: "Choose a text or image vote." };
  }
  if (!title) return { error: "Add a title." };

  const options = labels
    .map((label, i) => ({
      label,
      caption: captions[i] || "",
      imageUrl: voteType === "IMAGE" ? images[i] || "" : "",
      sortOrder: i,
    }))
    .filter((o) => o.label);

  if (options.length < 2) {
    return { error: "Add at least two options." };
  }

  if (voteType === "IMAGE") {
    for (const option of options) {
      if (!option.imageUrl || !isValidImageUrl(option.imageUrl)) {
        return { error: "Each image option needs an uploaded image." };
      }
      if (option.imageUrl.length > MAX_IMAGE_CHARS) {
        return { error: "Keep each image under about 1.5MB." };
      }
    }
  }

  const maxOrder = await prisma.decision.aggregate({
    _max: { streamOrder: true },
  });
  const streamOrder = (maxOrder._max.streamOrder ?? 0) + 1;

  const voters = await prisma.user.findMany({
    where: { role: { not: "VIEWER" } },
    select: { id: true },
  });

  const decision = await prisma.decision.create({
    data: {
      title,
      brief,
      status: "OPEN",
      templateKey: "CUSTOM",
      ballotType: "REACTION",
      streamOrder,
      ownerId: user.id,
      facilitatorId: user.id,
      opensAt: new Date(),
      options: {
        create: options.map((o) => ({
          label: o.label,
          caption: o.caption,
          imageUrl: o.imageUrl,
          sortOrder: o.sortOrder,
        })),
      },
      invitations: {
        create: voters.map((v) => ({
          userId: v.id,
          role: "VOTER",
        })),
      },
    },
  });

  await audit("decision.created", {
    userId: user.id,
    decisionId: decision.id,
    metadata: { voteType, optionCount: options.length },
  });
  revalidateDecision(decision.id);
  redirect(`/decisions/${decision.id}/ballot`);
}

export async function submitBallotAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("decisionId") || "");
  const rationale = String(formData.get("rationale") || "").trim();

  const decision = await prisma.decision.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      options: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      invitations: {
        where: { userId: user.id },
        select: { id: true, userId: true, role: true },
      },
    },
  });
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
    select: { id: true, submittedAt: true },
  });
  if (existing?.submittedAt) {
    return { error: "You already voted on this one." };
  }

  const ballot = existing
    ? await prisma.ballot.update({
        where: { id: existing.id },
        data: { rationale, submittedAt: new Date() },
        select: { id: true },
      })
    : await prisma.ballot.create({
        data: {
          decisionId: id,
          userId: user.id,
          rationale,
          submittedAt: new Date(),
        },
        select: { id: true },
      });

  await prisma.ballotReaction.deleteMany({ where: { ballotId: ballot.id } });
  await prisma.ballotReaction.createMany({
    data: reactions.map((r) => ({ ...r, ballotId: ballot.id })),
  });

  const [, nextPath] = await Promise.all([
    refreshQuorum(id),
    nextVotePath(user.id, id),
    audit("ballot.submitted", { userId: user.id, decisionId: id }),
  ]);

  revalidatePath("/");
  revalidatePath("/board");
  redirect(nextPath);
}
