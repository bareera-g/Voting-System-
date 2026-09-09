"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createVoteAction } from "@/actions/decisions";

type VoteType = "TEXT" | "IMAGE";

type DraftOption = {
  id: string;
  label: string;
  caption: string;
  imageUrl: string;
  fileName: string;
};

const MAX_BYTES = 1.5 * 1024 * 1024;

function newOption(): DraftOption {
  return {
    id: crypto.randomUUID(),
    label: "",
    caption: "",
    imageUrl: "",
    fileName: "",
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Couldn’t read that image."));
    reader.readAsDataURL(file);
  });
}

export function CreateVoteModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [voteType, setVoteType] = useState<VoteType | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [options, setOptions] = useState<DraftOption[]>([newOption(), newOption()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function reset() {
    setVoteType(null);
    setTitle("");
    setBrief("");
    setOptions([newOption(), newOption()]);
    setError(null);
    setPending(false);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function updateOption(id: string, patch: Partial<DraftOption>) {
    setOptions((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  async function onPickImage(id: string, file: File | null) {
    if (!file) {
      updateOption(id, { imageUrl: "", fileName: "" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Upload an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep each image under about 1.5MB.");
      return;
    }
    setError(null);
    const imageUrl = await readFileAsDataUrl(file);
    updateOption(id, { imageUrl, fileName: file.name });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voteType) return;
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("voteType", voteType);
    formData.set("title", title.trim());
    formData.set("brief", brief.trim());
    for (const option of options) {
      if (!option.label.trim()) continue;
      formData.append("optionLabel", option.label.trim());
      formData.append("optionCaption", option.caption.trim());
      formData.append("optionImage", option.imageUrl);
    }

    const result = await createVoteAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Create vote
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink/40"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="serif text-2xl">
                  Create vote
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {voteType
                    ? voteType === "TEXT"
                      ? "Text options people can like or don’t like."
                      : "Image options people can like or don’t like."
                    : "Choose what kind of vote to open."}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary px-3 py-2 text-sm"
                onClick={close}
                disabled={pending}
              >
                Close
              </button>
            </div>

            {!voteType ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="panel p-5 text-left transition hover:border-teal"
                  onClick={() => setVoteType("TEXT")}
                >
                  <span className="block font-medium">Text vote</span>
                  <span className="mt-1 block text-sm text-muted">
                    Labels and short notes only.
                  </span>
                </button>
                <button
                  type="button"
                  className="panel p-5 text-left transition hover:border-teal"
                  onClick={() => setVoteType("IMAGE")}
                >
                  <span className="block font-medium">Image vote</span>
                  <span className="mt-1 block text-sm text-muted">
                    Upload an image for each option.
                  </span>
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <button
                  type="button"
                  className="text-sm text-muted hover:text-ink"
                  onClick={() => {
                    setVoteType(null);
                    setError(null);
                  }}
                  disabled={pending}
                >
                  ← Change type
                </button>

                <div className="field">
                  <label htmlFor="create-title">Title</label>
                  <input
                    id="create-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={120}
                    placeholder="What are we deciding?"
                  />
                </div>

                <div className="field">
                  <label htmlFor="create-brief">Description (optional)</label>
                  <textarea
                    id="create-brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    maxLength={500}
                    placeholder="Any context voters should know"
                    className="min-h-[4.5rem]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Options
                    </p>
                    <button
                      type="button"
                      className="text-sm text-teal hover:text-alert"
                      onClick={() => setOptions((list) => [...list, newOption()])}
                      disabled={pending}
                    >
                      Add option
                    </button>
                  </div>

                  {options.map((option, index) => (
                    <div key={option.id} className="panel space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Option {index + 1}</p>
                        {options.length > 2 ? (
                          <button
                            type="button"
                            className="text-sm text-muted hover:text-alert"
                            onClick={() =>
                              setOptions((list) =>
                                list.filter((o) => o.id !== option.id),
                              )
                            }
                            disabled={pending}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="field">
                        <label>Label</label>
                        <input
                          value={option.label}
                          onChange={(e) =>
                            updateOption(option.id, { label: e.target.value })
                          }
                          required
                          maxLength={120}
                          placeholder={
                            voteType === "IMAGE" ? "Name this image" : "Option text"
                          }
                        />
                      </div>

                      {voteType === "TEXT" ? (
                        <div className="field">
                          <label>Caption (optional)</label>
                          <input
                            value={option.caption}
                            onChange={(e) =>
                              updateOption(option.id, { caption: e.target.value })
                            }
                            maxLength={200}
                            placeholder="Short note"
                          />
                        </div>
                      ) : (
                        <div className="field">
                          <label>Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              void onPickImage(
                                option.id,
                                e.target.files?.[0] ?? null,
                              )
                            }
                          />
                          {option.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={option.imageUrl}
                              alt=""
                              className="mt-2 max-h-28 rounded-xl border border-line object-contain"
                            />
                          ) : (
                            <p className="text-xs text-muted">
                              PNG or JPG, about 1.5MB max.
                            </p>
                          )}
                          {option.fileName ? (
                            <p className="text-xs text-muted">{option.fileName}</p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {error ? <p className="text-sm text-alert">{error}</p> : null}

                <button
                  className="btn btn-primary w-full"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? "Publishing…" : "Publish vote"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
