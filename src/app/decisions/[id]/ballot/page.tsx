import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guard";
import { getDecisionForBallot } from "@/lib/decisions";
import { canViewDecision, canVote, isOpen } from "@/lib/access";
import { ReactionBallot } from "@/components/ReactionBallot";

export default async function BallotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const decision = await getDecisionForBallot(id, user.id);
  if (!decision || !canViewDecision(user, decision, decision.invitations)) {
    notFound();
  }

  const invite = decision.invitations[0];
  const ballot = decision.ballots[0];

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
      locked={Boolean(ballot?.submittedAt)}
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
