import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guard";
import { getDecision } from "@/lib/decisions";
import { canViewDecision, canVote, isOpen } from "@/lib/access";
import { ReactionBallot } from "@/components/ReactionBallot";

export default async function BallotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const decision = await getDecision(id);
  if (!decision || !canViewDecision(user, decision, decision.invitations)) {
    notFound();
  }

  const invite = decision.invitations.find((i) => i.userId === user.id);
  const ballot = decision.ballots.find((b) => b.userId === user.id);

  if (invite?.role !== "VOTER") {
    return <p className="text-muted">This one isn’t for you.</p>;
  }

  if (!isOpen(decision.status) || !canVote(user, decision, decision.invitations)) {
    return <p className="text-muted">This vote is closed.</p>;
  }

  return (
    <ReactionBallot
      decisionId={decision.id}
      options={decision.options}
      initial={
        ballot
          ? {
              rationale: ballot.rationale,
              reactions: ballot.reactions,
            }
          : undefined
      }
    />
  );
}
