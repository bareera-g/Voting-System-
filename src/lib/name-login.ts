import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function emailFromName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  const suffix = createHash("sha1")
    .update(name.toLowerCase())
    .digest("hex")
    .slice(0, 8);
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

  const email = emailFromName(name);

  // Prefer the deterministic guest email so retries are stable.
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        role: { not: "VIEWER" },
      },
    });
  }

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          title: "Voter",
          role: "VOTER",
          // Unused — name login only. Avoid bcrypt on the request path.
          passwordHash: `guest:${randomBytes(16).toString("hex")}`,
        },
      });
    } catch {
      // Race: another request created the same guest email.
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error("create_failed");
    }
  }

  await inviteToOpenDecisions(user.id);
  return user;
}
