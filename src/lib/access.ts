import type { Decision, Invitation, User } from "@prisma/client";

export function isAdmin(user: Pick<User, "role">) {
  return user.role === "ADMIN";
}

export function canFacilitate(
  user: Pick<User, "id" | "role">,
  decision: Pick<Decision, "ownerId" | "facilitatorId">,
) {
  return (
    isAdmin(user) ||
    user.id === decision.facilitatorId ||
    user.id === decision.ownerId
  );
}

export function getInvite(
  user: Pick<User, "id">,
  invitations: Invitation[],
) {
  return invitations.find((i) => i.userId === user.id);
}

export function canVote(
  user: Pick<User, "id" | "role">,
  decision: Pick<Decision, "status">,
  invitations: Invitation[],
) {
  const invite = getInvite(user, invitations);
  if (!invite || invite.role !== "VOTER") return false;
  return decision.status === "OPEN" || decision.status === "QUORUM_MET";
}

export function canViewDecision(
  user: Pick<User, "id" | "role">,
  decision: Pick<Decision, "ownerId" | "facilitatorId">,
  invitations: Invitation[],
) {
  if (canFacilitate(user, decision)) return true;
  return Boolean(getInvite(user, invitations));
}

export function canSeeNamedResults(status: string) {
  return status === "CLOSED" || status === "ARCHIVED";
}

export function isOpen(status: string) {
  return status === "OPEN" || status === "QUORUM_MET";
}
