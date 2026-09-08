import type {
  Ballot,
  BallotRank,
  BallotReaction,
  BallotScore,
  Criterion,
  Option,
  User,
} from "@prisma/client";

type BallotWithBits = Ballot & {
  user: Pick<User, "id" | "name" | "title">;
  scores: BallotScore[];
  ranks: BallotRank[];
  reactions: BallotReaction[];
};

export type NamedBallot = {
  userId: string;
  name: string;
  title: string;
  rationale: string;
  submittedAt: string | null;
  ranks: { optionId: string; rank: number }[];
  scores: { optionId: string; criterionId: string; score: number }[];
  reactions: { optionId: string; sentiment: string; improve: string }[];
};

export type OptionResult = {
  optionId: string;
  label: string;
  weightedAverage: number;
  borda: number;
  firstPlace: number;
  likes: number;
  dislikes: number;
  likeShare: number;
  criterionAverages: Record<string, number>;
  criterionWins: string[];
  improvements: { name: string; text: string }[];
};

export type ResultsModel = {
  submittedCount: number;
  voterCount: number;
  quorumPercent: number;
  quorumMet: boolean;
  ballotType: "REACTION" | "RUBRIC";
  cells: { optionId: string; criterionId: string; average: number }[];
  options: OptionResult[];
  ranked: OptionResult[];
  recommended: OptionResult | null;
  split: boolean;
  hybridNotes: string | null;
  namedBallots: NamedBallot[];
};

const SPLIT_MARGIN = 0.25;

export function isReactionBallot(ballotType?: string | null) {
  return ballotType !== "RUBRIC";
}

export function computeResults(input: {
  options: Option[];
  criteria: Criterion[];
  ballots: BallotWithBits[];
  voterCount: number;
  quorumPercent: number;
  ballotType?: string;
}): ResultsModel {
  const submitted = input.ballots.filter((b) => b.submittedAt);
  const voterCount = input.voterCount;
  const quorumMet =
    voterCount > 0 &&
    submitted.length / voterCount >= input.quorumPercent / 100;
  const ballotType = isReactionBallot(input.ballotType) ? "REACTION" : "RUBRIC";

  if (ballotType === "REACTION") {
    return computeReactionResults({
      options: input.options,
      submitted,
      voterCount,
      quorumPercent: input.quorumPercent,
      quorumMet,
    });
  }

  const cells: ResultsModel["cells"] = [];
  const optionResults: OptionResult[] = input.options.map((option) => {
    const criterionAverages: Record<string, number> = {};
    let weightedSum = 0;
    let weightTotal = 0;

    for (const criterion of input.criteria) {
      const scores = submitted
        .map(
          (b) =>
            b.scores.find(
              (s) => s.optionId === option.id && s.criterionId === criterion.id,
            )?.score,
        )
        .filter((n): n is number => typeof n === "number");
      const average =
        scores.length === 0
          ? 0
          : scores.reduce((a, b) => a + b, 0) / scores.length;
      criterionAverages[criterion.id] = average;
      cells.push({ optionId: option.id, criterionId: criterion.id, average });
      weightedSum += average * criterion.weight;
      weightTotal += criterion.weight;
    }

    const borda = submitted.reduce((sum, ballot) => {
      const rank = ballot.ranks.find((r) => r.optionId === option.id)?.rank;
      if (!rank) return sum;
      return sum + (input.options.length - rank + 1);
    }, 0);

    const firstPlace = submitted.filter(
      (b) => b.ranks.find((r) => r.optionId === option.id)?.rank === 1,
    ).length;

    return {
      optionId: option.id,
      label: option.label,
      weightedAverage: weightTotal === 0 ? 0 : weightedSum / weightTotal,
      borda,
      firstPlace,
      likes: 0,
      dislikes: 0,
      likeShare: 0,
      criterionAverages,
      criterionWins: [],
      improvements: [],
    };
  });

  for (const criterion of input.criteria) {
    let best = -1;
    let winners: OptionResult[] = [];
    for (const option of optionResults) {
      const avg = option.criterionAverages[criterion.id] ?? 0;
      if (avg > best) {
        best = avg;
        winners = [option];
      } else if (avg === best && avg > 0) {
        winners.push(option);
      }
    }
    if (best <= 0) continue;
    for (const winner of winners) {
      winner.criterionWins.push(criterion.id);
    }
  }

  const ranked = [...optionResults].sort((a, b) => {
    if (b.weightedAverage !== a.weightedAverage) {
      return b.weightedAverage - a.weightedAverage;
    }
    if (b.borda !== a.borda) return b.borda - a.borda;
    return b.firstPlace - a.firstPlace;
  });

  const recommended = submitted.length > 0 ? ranked[0] ?? null : null;
  const runnerUp = ranked[1];
  const uniqueWinners = new Set(
    optionResults.flatMap((o) => o.criterionWins.map(() => o.optionId)),
  );
  const split =
    Boolean(recommended && runnerUp) &&
    (Math.abs((recommended?.weightedAverage ?? 0) - (runnerUp?.weightedAverage ?? 0)) <
      SPLIT_MARGIN ||
      uniqueWinners.size >= 2);

  let hybridNotes: string | null = null;
  if (split && submitted.length > 0) {
    const lines = optionResults
      .filter((o) => o.criterionWins.length > 0)
      .map((o) => {
        const names = o.criterionWins
          .map((id) => input.criteria.find((c) => c.id === id)?.name)
          .filter(Boolean);
        return `${o.label} leads on ${names.join(", ")}`;
      });
    hybridNotes =
      lines.length > 1
        ? `Split decision. Consider a hybrid: ${lines.join("; ")}.`
        : "Top options are close. Do not force a false winner — the owner should record Chosen, Hybrid, or Reopen.";
  }

  return {
    submittedCount: submitted.length,
    voterCount,
    quorumPercent: input.quorumPercent,
    quorumMet,
    ballotType,
    cells,
    options: optionResults,
    ranked,
    recommended,
    split,
    hybridNotes,
    namedBallots: namedFrom(submitted),
  };
}

function computeReactionResults(input: {
  options: Option[];
  submitted: BallotWithBits[];
  voterCount: number;
  quorumPercent: number;
  quorumMet: boolean;
}): ResultsModel {
  const optionResults: OptionResult[] = input.options.map((option) => {
    const votes = input.submitted
      .map((b) => b.reactions.find((r) => r.optionId === option.id))
      .filter(Boolean) as BallotReaction[];
    const likes = votes.filter((v) => v.sentiment === "LIKE").length;
    const dislikes = votes.filter((v) => v.sentiment === "DISLIKE").length;
    const total = likes + dislikes;
    const improvements = input.submitted.flatMap((b) => {
      const r = b.reactions.find((x) => x.optionId === option.id);
      if (!r?.improve.trim()) return [];
      return [{ name: b.user.name, text: r.improve.trim() }];
    });
    return {
      optionId: option.id,
      label: option.label,
      weightedAverage: total === 0 ? 0 : likes / total,
      borda: likes,
      firstPlace: likes,
      likes,
      dislikes,
      likeShare: total === 0 ? 0 : likes / total,
      criterionAverages: {},
      criterionWins: [],
      improvements,
    };
  });

  const ranked = [...optionResults].sort((a, b) => {
    if (b.likes !== a.likes) return b.likes - a.likes;
    if (b.likeShare !== a.likeShare) return b.likeShare - a.likeShare;
    return a.dislikes - b.dislikes;
  });

  const recommended = input.submitted.length > 0 ? ranked[0] ?? null : null;
  const contested = optionResults.filter((o) => o.likes > 0 && o.dislikes > 0);
  const split = contested.length >= 2 || Boolean(
    ranked[0] && ranked[1] && ranked[0].likes === ranked[1].likes && ranked[0].likes > 0,
  );

  return {
    submittedCount: input.submitted.length,
    voterCount: input.voterCount,
    quorumPercent: input.quorumPercent,
    quorumMet: input.quorumMet,
    ballotType: "REACTION",
    cells: [],
    options: optionResults,
    ranked,
    recommended,
    split,
    hybridNotes: split
      ? "Leadership is split. Use the improvement notes — a hybrid or a narrowed set is more honest than a false winner."
      : null,
    namedBallots: namedFrom(input.submitted),
  };
}

function namedFrom(submitted: BallotWithBits[]): NamedBallot[] {
  return submitted.map((b) => ({
    userId: b.user.id,
    name: b.user.name,
    title: b.user.title,
    rationale: b.rationale,
    submittedAt: b.submittedAt?.toISOString() ?? null,
    ranks: b.ranks.map((r) => ({ optionId: r.optionId, rank: r.rank })),
    scores: b.scores.map((s) => ({
      optionId: s.optionId,
      criterionId: s.criterionId,
      score: s.score,
    })),
    reactions: (b.reactions ?? []).map((r) => ({
      optionId: r.optionId,
      sentiment: r.sentiment,
      improve: r.improve,
    })),
  }));
}
