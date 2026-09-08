import type { ResultsModel } from "@/lib/scoring";
import { scoreTone } from "@/lib/format";

export function Heatmap({
  options,
  criteria,
  results,
}: {
  options: { id: string; label: string }[];
  criteria: { id: string; name: string }[];
  results: ResultsModel;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="px-2 py-2 text-left font-medium text-muted">Criterion</th>
            {options.map((o) => (
              <th key={o.id} className="px-2 py-2 text-left font-medium">
                {o.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c) => (
            <tr key={c.id}>
              <td className="px-2 py-2 text-muted">{c.name}</td>
              {options.map((o) => {
                const cell = results.cells.find(
                  (x) => x.optionId === o.id && x.criterionId === c.id,
                );
                const avg = cell?.average ?? 0;
                return (
                  <td key={o.id}>
                    <div
                      className={`rounded-lg px-3 py-3 text-center heat-${scoreTone(avg)}`}
                    >
                      {avg ? avg.toFixed(2) : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="px-2 py-2 font-medium">Weighted</td>
            {options.map((o) => {
              const row = results.options.find((x) => x.optionId === o.id);
              return (
                <td key={o.id} className="px-2 py-2 font-medium">
                  {row ? row.weightedAverage.toFixed(2) : "—"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function NamedTable({
  options,
  results,
}: {
  options: { id: string; label: string }[];
  results: ResultsModel;
}) {
  if (results.ballotType === "REACTION") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-4 font-medium">Voter</th>
              <th className="py-2 pr-4 font-medium">Liked</th>
              <th className="py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {results.namedBallots.map((b) => {
              const liked = (b.reactions ?? [])
                .filter((r) => r.sentiment === "LIKE")
                .map((r) => options.find((o) => o.id === r.optionId)?.label)
                .filter(Boolean);
              const notes = [
                b.rationale,
                ...b.reactions.filter((r) => r.improve).map((r) => r.improve),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={b.userId} className="border-b border-line align-top">
                  <td className="py-3 pr-4">
                    <div>{b.name}</div>
                    <div className="text-xs text-muted">{b.title}</div>
                  </td>
                  <td className="py-3 pr-4">{liked.join(", ") || "—"}</td>
                  <td className="py-3 italic">{notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-2 pr-4 font-medium">Voter</th>
            <th className="py-2 pr-4 font-medium">Top rank</th>
            <th className="py-2 font-medium">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {results.namedBallots.map((b) => {
            const top = b.ranks.find((r) => r.rank === 1);
            const label = options.find((o) => o.id === top?.optionId)?.label ?? "—";
            return (
              <tr key={b.userId} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <div>{b.name}</div>
                  <div className="text-xs text-muted">{b.title}</div>
                </td>
                <td className="py-3 pr-4">{label}</td>
                <td className="py-3 italic">{b.rationale}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LikeTally({
  options,
  results,
}: {
  options: { id: string; label: string; imageUrl?: string }[];
  results: ResultsModel;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((o) => {
        const row = results.options.find((x) => x.optionId === o.id);
        const likes = row?.likes ?? 0;
        const dislikes = row?.dislikes ?? 0;
        const total = likes + dislikes;
        const pct = total ? Math.round((likes / total) * 100) : 0;
        return (
          <div key={o.id} className="panel overflow-hidden">
            {o.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={o.imageUrl}
                alt={o.label}
                className="max-h-40 w-full bg-paper-2 object-contain object-top"
              />
            ) : null}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="serif text-lg">{o.label}</h3>
                <span className="text-sm text-muted">{pct}% like</span>
              </div>
              <p className="mt-2 text-sm">
                {likes} like · {dislikes} don’t like
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
              {row?.improvements.length ? (
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  {row.improvements.map((n, i) => (
                    <li key={i}>
                      <span className="text-ink">{n.name}:</span> {n.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

