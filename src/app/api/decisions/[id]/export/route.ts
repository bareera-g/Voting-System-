import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDecision, resultsFor } from "@/lib/decisions";
import { canSeeNamedResults, canViewDecision } from "@/lib/access";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const decision = await getDecision(id);
  if (!decision || !canViewDecision(user, decision, decision.invitations)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canSeeNamedResults(decision.status)) {
    return NextResponse.json({ error: "Results are sealed until close." }, { status: 403 });
  }

  const results = resultsFor(decision);
  const header =
    results.ballotType === "REACTION"
      ? [
          "Voter",
          "Title",
          "Overall note",
          ...decision.options.flatMap((o) => [`${o.label} sentiment`, `${o.label} improve`]),
        ]
      : [
          "Voter",
          "Title",
          "Rationale",
          ...decision.options.map((o) => `Rank: ${o.label}`),
          ...decision.options.flatMap((o) =>
            decision.criteria.map((c) => `${o.label} / ${c.name}`),
          ),
        ];

  const rows = results.namedBallots.map((b) => {
    if (results.ballotType === "REACTION") {
      const byOption = Object.fromEntries(b.reactions.map((r) => [r.optionId, r]));
      return [
        b.name,
        b.title,
        `"${(b.rationale || "").replace(/"/g, '""')}"`,
        ...decision.options.flatMap((o) => {
          const r = byOption[o.id];
          return [r?.sentiment ?? "", `"${(r?.improve || "").replace(/"/g, '""')}"`];
        }),
      ].join(",");
    }
    const rankByOption = Object.fromEntries(b.ranks.map((r) => [r.optionId, r.rank]));
    const scoreKey = (oid: string, cid: string) =>
      b.scores.find((s) => s.optionId === oid && s.criterionId === cid)?.score ?? "";
    return [
      b.name,
      b.title,
      `"${b.rationale.replace(/"/g, '""')}"`,
      ...decision.options.map((o) => rankByOption[o.id] ?? ""),
      ...decision.options.flatMap((o) =>
        decision.criteria.map((c) => scoreKey(o.id, c.id)),
      ),
    ].join(",");
  });

  const outcome = decision.outcome
    ? `\n\nOutcome,${decision.outcome.type},${decision.outcome.chosenOption?.label ?? ""},"${decision.outcome.rationale.replace(/"/g, '""')}",override=${decision.outcome.isOverride}`
    : "";

  const csv = [header.join(","), ...rows].join("\n") + outcome;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${decision.title.replace(/\s+/g, "-").toLowerCase()}-votes.csv"`,
    },
  });
}
