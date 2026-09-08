"use client";

import { useMemo, useState } from "react";
import { submitBallotAction } from "@/actions/decisions";

type Option = {
  id: string;
  label: string;
  caption: string;
  imageUrl: string;
};
type Criterion = { id: string; name: string; description: string };

export function BallotForm({
  decisionId,
  options,
  criteria,
  initial,
}: {
  decisionId: string;
  options: Option[];
  criteria: Criterion[];
  initial?: {
    rationale: string;
    scores: { optionId: string; criterionId: string; score: number }[];
    ranks: { optionId: string; rank: number }[];
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const defaultRanks = useMemo(
    () =>
      Object.fromEntries(
        options.map((o, i) => [
          o.id,
          initial?.ranks.find((r) => r.optionId === o.id)?.rank ?? i + 1,
        ]),
      ),
    [options, initial],
  );
  const [ranks, setRanks] = useState<Record<string, number>>(defaultRanks);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await submitBallotAction(formData);
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <input type="hidden" name="decisionId" value={decisionId} />
      {options.map((option) => (
        <section key={option.id} className="panel overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={option.imageUrl}
            alt={option.label}
            className="max-h-[320px] w-full bg-paper-2 object-contain object-top"
          />
          <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="serif text-2xl">{option.label}</h3>
                  <p className="mt-1 text-sm text-muted">{option.caption}</p>
                </div>
                <label className="field w-36">
                  <span>Rank</span>
                  <select
                    name={`rank:${option.id}`}
                    value={ranks[option.id]}
                    onChange={(e) =>
                      setRanks((r) => ({ ...r, [option.id]: Number(e.target.value) }))
                    }
                  >
                    {options.map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-5 grid gap-4">
                {criteria.map((criterion) => {
                  const prior = initial?.scores.find(
                    (s) => s.optionId === option.id && s.criterionId === criterion.id,
                  )?.score;
                  return (
                    <fieldset key={criterion.id} className="border-t border-line pt-3">
                      <legend className="text-sm font-medium">{criterion.name}</legend>
                      <p className="mb-2 text-xs text-muted">{criterion.description}</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className="flex cursor-pointer items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`score:${option.id}:${criterion.id}`}
                              value={n}
                              defaultChecked={prior === n}
                              required
                            />
                            {n}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </div>
        </section>
      ))}
      <div className="field">
        <label htmlFor="rationale">One sentence on your top-ranked option</label>
        <textarea
          id="rationale"
          name="rationale"
          required
          defaultValue={initial?.rationale}
          placeholder="I am choosing this because…"
        />
      </div>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit named ballot"}
      </button>
    </form>
  );
}
