"use client";

import { useState } from "react";
import { submitBallotAction } from "@/actions/decisions";

type Option = {
  id: string;
  label: string;
  caption: string;
  imageUrl: string;
};

function isIcon(option: Option) {
  return option.imageUrl.includes("/cards/icon-");
}

export function ReactionBallot({
  decisionId,
  options,
  initial,
}: {
  decisionId: string;
  options: Option[];
  initial?: {
    rationale: string;
    reactions: { optionId: string; sentiment: string; improve: string }[];
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentiments, setSentiments] = useState<Record<string, string>>(
    Object.fromEntries(
      (initial?.reactions ?? []).map((r) => [r.optionId, r.sentiment]),
    ),
  );

  const complete = options.every(
    (o) => sentiments[o.id] === "LIKE" || sentiments[o.id] === "DISLIKE",
  );
  const boards = options.filter((o) => !isIcon(o));
  const icons = options.filter(isIcon);
  const travel = icons.filter((o) => o.label.startsWith("Travel"));
  const contract = icons.filter((o) => o.label.startsWith("Contract"));

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await submitBallotAction(formData);
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <form action={onSubmit} className="space-y-8 pb-24">
      <input type="hidden" name="decisionId" value={decisionId} />
      <input type="hidden" name="rationale" value="" />
      {boards.map((option) => (
        <OptionBlock
          key={option.id}
          option={option}
          sentiment={sentiments[option.id] ?? ""}
          initialImprove={
            initial?.reactions.find((r) => r.optionId === option.id)?.improve
          }
          compact={false}
          onSentiment={(value) =>
            setSentiments((s) => ({ ...s, [option.id]: value }))
          }
        />
      ))}
      {travel.length > 0 ? (
        <IconGroup
          title="Travel"
          options={travel}
          sentiments={sentiments}
          initial={initial}
          onSentiment={(id, value) =>
            setSentiments((s) => ({ ...s, [id]: value }))
          }
        />
      ) : null}
      {contract.length > 0 ? (
        <IconGroup
          title="Contract"
          options={contract}
          sentiments={sentiments}
          initial={initial}
          onSentiment={(id, value) =>
            setSentiments((s) => ({ ...s, [id]: value }))
          }
        />
      ) : null}
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <div className="sticky bottom-0 -mx-6 border-t border-line bg-paper/95 px-6 py-4 backdrop-blur">
        <button
          className="btn btn-primary w-full"
          type="submit"
          disabled={pending || !complete}
        >
          {pending ? "Saving…" : complete ? "Submit" : "Like or don’t like each one"}
        </button>
      </div>
    </form>
  );
}

function IconGroup({
  title,
  options,
  sentiments,
  initial,
  onSentiment,
}: {
  title: string;
  options: Option[];
  sentiments: Record<string, string>;
  initial?: { reactions: { optionId: string; improve: string }[] };
  onSentiment: (id: string, value: string) => void;
}) {
  return (
    <section>
      <h2 className="serif text-2xl">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {options.map((option) => (
          <OptionBlock
            key={option.id}
            option={option}
            sentiment={sentiments[option.id] ?? ""}
            initialImprove={
              initial?.reactions.find((r) => r.optionId === option.id)?.improve
            }
            compact
            onSentiment={(value) => onSentiment(option.id, value)}
          />
        ))}
      </div>
    </section>
  );
}

function OptionBlock({
  option,
  sentiment,
  initialImprove,
  compact,
  onSentiment,
}: {
  option: Option;
  sentiment: string;
  initialImprove?: string;
  compact: boolean;
  onSentiment: (value: string) => void;
}) {
  const name = option.label.includes(" · ")
    ? option.label.split(" · ")[1]
    : option.label;
  const board = option.imageUrl.startsWith("/mockups/");

  return (
    <section className="overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${option.imageUrl}?v=10`}
        alt={option.label}
        className={`mx-auto w-full object-contain ${
          compact ? "max-h-28" : board ? "max-h-[480px]" : "max-h-[320px]"
        }`}
      />
      <div className={`space-y-3 ${compact ? "pt-3" : "p-4"}`}>
        <div>
          <h3 className="text-base font-medium">{name}</h3>
          {option.caption ? (
            <p className="mt-1 text-sm text-muted">{option.caption}</p>
          ) : null}
        </div>
        <input type="hidden" name={`sentiment:${option.id}`} value={sentiment} />
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn flex-1 ${sentiment === "LIKE" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onSentiment("LIKE")}
          >
            Like
          </button>
          <button
            type="button"
            className={`btn flex-1 ${sentiment === "DISLIKE" ? "btn-danger" : "btn-secondary"}`}
            onClick={() => onSentiment("DISLIKE")}
          >
            Don’t like
          </button>
        </div>
        {compact ? (
          <input
            name={`improve:${option.id}`}
            defaultValue={initialImprove}
            placeholder="Optional note"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          />
        ) : (
          <textarea
            name={`improve:${option.id}`}
            defaultValue={initialImprove}
            placeholder="Anything you’d change? (optional)"
            className="min-h-[3.5rem] w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          />
        )}
      </div>
    </section>
  );
}
