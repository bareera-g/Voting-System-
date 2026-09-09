"use client";

import { useState, useTransition } from "react";
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

function hasImage(option: Option) {
  return Boolean(option.imageUrl?.trim());
}

function optionVisualSrc(imageUrl: string) {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return `${imageUrl}?v=10`;
}

export function ReactionBallot({
  decisionId,
  options,
  initial,
  locked = false,
}: {
  decisionId: string;
  options: Option[];
  locked?: boolean;
  initial?: {
    rationale: string;
    reactions: { optionId: string; sentiment: string; improve: string }[];
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
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
  const busy = pending || locked;

  function onSubmit(formData: FormData) {
    if (locked || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitBallotAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      action={onSubmit}
      className={`space-y-8 pb-24 ${pending ? "pointer-events-none opacity-70" : ""}`}
      aria-busy={pending}
    >
      <input type="hidden" name="decisionId" value={decisionId} />
      <input type="hidden" name="rationale" value="" />
      {locked ? (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
          You already voted on this one.
        </p>
      ) : null}
      {boards.map((option) => (
        <OptionBlock
          key={option.id}
          option={option}
          sentiment={sentiments[option.id] ?? ""}
          initialImprove={
            initial?.reactions.find((r) => r.optionId === option.id)?.improve
          }
          compact={false}
          locked={busy}
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
          locked={busy}
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
          locked={busy}
          onSentiment={(id, value) =>
            setSentiments((s) => ({ ...s, [id]: value }))
          }
        />
      ) : null}
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      {locked ? null : (
        <div className="sticky bottom-0 -mx-6 border-t border-line bg-paper/95 px-6 py-4 backdrop-blur">
          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={pending || !complete}
          >
            {pending
              ? "Saving your vote…"
              : complete
                ? "Submit"
                : "Like or don’t like each one"}
          </button>
        </div>
      )}
    </form>
  );
}

function IconGroup({
  title,
  options,
  sentiments,
  initial,
  locked,
  onSentiment,
}: {
  title: string;
  options: Option[];
  sentiments: Record<string, string>;
  initial?: { reactions: { optionId: string; improve: string }[] };
  locked: boolean;
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
            locked={locked}
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
  locked,
  onSentiment,
}: {
  option: Option;
  sentiment: string;
  initialImprove?: string;
  compact: boolean;
  locked: boolean;
  onSentiment: (value: string) => void;
}) {
  const name = option.label.includes(" · ")
    ? option.label.split(" · ")[1]
    : option.label;
  const board = option.imageUrl.startsWith("/mockups/");
  const showImage = hasImage(option);

  return (
    <section className="overflow-hidden">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={optionVisualSrc(option.imageUrl)}
          alt={option.label}
          loading="lazy"
          decoding="async"
          className={`mx-auto w-full object-contain ${
            compact ? "max-h-28" : board ? "max-h-[480px]" : "max-h-[320px]"
          }`}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-2xl border border-line bg-white px-4 text-center ${
            compact ? "min-h-24" : "min-h-36"
          }`}
        >
          <p className={`font-medium ${compact ? "text-base" : "serif text-2xl"}`}>
            {name}
          </p>
        </div>
      )}
      <div className={`space-y-3 ${compact ? "pt-3" : "p-4"}`}>
        <div>
          {showImage ? <h3 className="text-base font-medium">{name}</h3> : null}
          {option.caption ? (
            <p className={`text-sm text-muted ${showImage ? "mt-1" : ""}`}>
              {option.caption}
            </p>
          ) : null}
        </div>
        <input type="hidden" name={`sentiment:${option.id}`} value={sentiment} />
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn flex-1 ${sentiment === "LIKE" ? "btn-primary" : "btn-secondary"}`}
            disabled={locked}
            onClick={() => onSentiment("LIKE")}
          >
            Like
          </button>
          <button
            type="button"
            className={`btn flex-1 ${sentiment === "DISLIKE" ? "btn-danger" : "btn-secondary"}`}
            disabled={locked}
            onClick={() => onSentiment("DISLIKE")}
          >
            Don’t like
          </button>
        </div>
        {compact ? (
          locked && !initialImprove ? null : (
            <input
              name={`improve:${option.id}`}
              defaultValue={initialImprove}
              placeholder={locked ? "" : "Optional note"}
              readOnly={locked}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
            />
          )
        ) : locked && !initialImprove ? null : (
          <textarea
            name={`improve:${option.id}`}
            defaultValue={initialImprove}
            placeholder={locked ? "" : "Anything you’d change? (optional)"}
            readOnly={locked}
            className="min-h-[3.5rem] w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
          />
        )}
      </div>
    </section>
  );
}
