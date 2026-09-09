import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/guard";
import { AppShell } from "@/components/AppShell";
import { decisionInclude, resultsFor, type FullDecision } from "@/lib/decisions";
import { canViewDecision } from "@/lib/access";

export default async function BoardPage() {
  const user = await requirePageUser();
  const decisions = (await prisma.decision.findMany({
    where: { status: { in: ["OPEN", "QUORUM_MET", "CLOSED"] } },
    include: decisionInclude,
    orderBy: { streamOrder: "asc" },
  })) as FullDecision[];

  const streams = decisions
    .filter((d) => canViewDecision(user, d, d.invitations))
    .map((d) => {
      const results = resultsFor(d);
      const rows = results.ranked
        .map((row) => {
          const option = d.options.find((o) => o.id === row.optionId);
          return {
            id: row.optionId,
            label: row.label,
            imageUrl: option?.imageUrl ?? "",
            likes: row.likes,
            dislikes: row.dislikes,
          };
        })
        .filter((row) => row.likes + row.dislikes > 0);
      return { title: d.title, rows };
    });

  const anyVotes = streams.some((s) => s.rows.length > 0);

  return (
    <AppShell user={user} tab="board">
      <h1 className="serif text-4xl">Board</h1>

      {!anyVotes ? (
        <p className="mt-8 text-muted">No votes yet.</p>
      ) : (
        <div className="mt-10 space-y-12">
          {streams.map((stream) =>
            stream.rows.length === 0 ? null : (
              <section key={stream.title}>
                <h2 className="serif text-2xl">{stream.title}</h2>
                <ol className="mt-4 space-y-2">
                  {stream.rows.map((row, i) => {
                    const total = row.likes + row.dislikes;
                    const likePct = total === 0 ? 0 : (row.likes / total) * 100;
                    return (
                      <li key={row.id} className="flex items-center gap-4 py-2">
                        <span className="w-5 shrink-0 text-sm text-muted">{i + 1}</span>
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              row.imageUrl.startsWith("data:")
                                ? row.imageUrl
                                : `${row.imageUrl}?v=10`
                            }
                            alt=""
                            className="h-14 w-14 shrink-0 object-contain"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-1 text-center text-[10px] font-medium leading-tight text-muted">
                            {row.label.slice(0, 18)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{row.label}</p>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper-2">
                            <div
                              className="h-full rounded-full bg-teal"
                              style={{ width: `${likePct}%` }}
                            />
                          </div>
                        </div>
                        <p className="shrink-0 text-sm tabular-nums">
                          {row.likes} like
                          <span className="text-muted"> · {row.dislikes} don’t</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ),
          )}
        </div>
      )}
    </AppShell>
  );
}
