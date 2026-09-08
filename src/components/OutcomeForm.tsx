"use client";

import { useState } from "react";
import { recordOutcomeAction } from "@/actions/decisions";

export function OutcomeForm({
  decisionId,
  options,
  recommendedId,
  hybridDefault,
  existing,
}: {
  decisionId: string;
  options: { id: string; label: string }[];
  recommendedId: string | null;
  hybridDefault: string | null;
  existing?: {
    type: string;
    chosenOptionId: string | null;
    rationale: string;
    hybridNotes: string;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(existing?.type ?? "CHOSEN");

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await recordOutcomeAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={onSubmit} className="panel space-y-4 p-5">
      <input type="hidden" name="decisionId" value={decisionId} />
      <input type="hidden" name="recommendedId" value={recommendedId ?? ""} />
      <h3 className="serif text-2xl">Record outcome</h3>
      <p className="text-sm text-muted">
        The vote informs the decision. You may choose a non-winning option if you own the
        reason.
      </p>
      <div className="field">
        <label>Type</label>
        <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="CHOSEN">Chosen</option>
          <option value="HYBRID">Hybrid</option>
          <option value="REOPEN">Reopen</option>
        </select>
      </div>
      {type !== "REOPEN" ? (
        <div className="field">
          <label>Option</label>
          <select name="chosenOptionId" defaultValue={existing?.chosenOptionId ?? recommendedId ?? ""}>
            <option value="">Select</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {type === "HYBRID" ? (
        <div className="field">
          <label>Hybrid notes</label>
          <textarea
            name="hybridNotes"
            defaultValue={existing?.hybridNotes || hybridDefault || ""}
          />
        </div>
      ) : (
        <input type="hidden" name="hybridNotes" value={existing?.hybridNotes ?? ""} />
      )}
      <div className="field">
        <label>Owner rationale</label>
        <textarea
          name="rationale"
          required
          defaultValue={existing?.rationale}
          placeholder="We are picking this because…"
        />
      </div>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <button className="btn btn-primary" type="submit">
        Sign and record
      </button>
    </form>
  );
}
