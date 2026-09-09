import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

function emailFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  const suffix = createHash("sha1").update(name.toLowerCase()).digest("hex").slice(0, 8);
  return `${slug || "voter"}.${suffix}@guest.local`;
}

async function inviteToOpenDecisions(userId: string) {
  const open = await prisma.decision.findMany({
    where: { status: { in: ["OPEN", "QUORUM_MET"] } },
    select: { id: true },
  });
  if (open.length === 0) return;
  await prisma.invitation.createMany({
    data: open.map((decision) => ({
      decisionId: decision.id,
      userId,
      role: "VOTER",
    })),
    skipDuplicates: true,
  });
}

/** Find an existing voter by name, or create one. Any name is allowed. */
export async function findOrCreateVoterByName(rawName: string) {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) {
    throw new Error("invalid_name");
  }

  const matches = await prisma.user.findMany({
    where: {
      name: { equals: name, mode: "insensitive" },
      role: { not: "VIEWER" },
    },
    take: 2,
  });

  let user = matches.length === 1 ? matches[0] : null;

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email: emailFromName(name),
        title: "Voter",
        role: "VOTER",
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      },
    });
  }

  await inviteToOpenDecisions(user.id);
  return user;
}
