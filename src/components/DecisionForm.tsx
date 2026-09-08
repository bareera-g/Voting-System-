"use client";

import { useMemo, useState } from "react";
import { createDecisionAction } from "@/actions/decisions";
import { TEMPLATES, type DecisionTemplate } from "@/lib/templates";

type Person = { id: string; name: string; title: string; email: string; role: string };

type DraftOption = {
  label: string;
  caption: string;
  jobs: string;
  imageUrl: string;
};

export function DecisionForm({ people }: { people: Person[] }) {
  const [templateKey, setTemplateKey] = useState("CARD_DESIGN");
  const template = useMemo(
    () => TEMPLATES.find((t) => t.key === templateKey) as DecisionTemplate,
    [templateKey],
  );
  const [brief, setBrief] = useState(template.defaultBrief);
  const [criteria, setCriteria] = useState(template.criteria);
  const [options, setOptions] = useState<DraftOption[]>([
    { label: "", caption: "", jobs: "", imageUrl: "" },
    { label: "", caption: "", jobs: "", imageUrl: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function applyTemplate(key: string) {
    const next = TEMPLATES.find((t) => t.key === key)!;
    setTemplateKey(key);
    setBrief(next.defaultBrief);
    setCriteria(next.criteria);
  }

  async function upload(file: File, index: number) {
    const data = new FormData();
    data.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: data });
    const json = await res.json();
    if (json.url) {
      setOptions((opts) =>
        opts.map((o, i) => (i === index ? { ...o, imageUrl: json.url } : o)),
      );
    }
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createDecisionAction(formData);
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field">
          <label>Template</label>
          <select
            name="templateKey"
            value={templateKey}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">{template.description}</p>
        </div>
        <div className="field">
          <label>Title</label>
          <input name="title" required placeholder="AIQ card design direction" />
        </div>
        <div className="field">
          <label>Owner</label>
          <select name="ownerId" defaultValue={people.find((p) => p.role === "ADMIN")?.id}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Window (hours)</label>
            <input
              name="windowHours"
              type="number"
              defaultValue={template.defaultWindowHours}
            />
          </div>
          <div className="field">
            <label>Quorum %</label>
            <input
              name="quorumPercent"
              type="number"
              defaultValue={template.defaultQuorumPercent}
            />
          </div>
        </div>
      </div>
      <div className="field">
        <label>Brief</label>
        <textarea name="brief" value={brief} onChange={(e) => setBrief(e.target.value)} />
      </div>

      <section>
        <h2 className="serif mb-3 text-2xl">Options</h2>
        <div className="space-y-4">
          {options.map((option, i) => (
            <div key={i} className="panel grid gap-3 p-4 md:grid-cols-2">
              <input type="hidden" name="optionImage" value={option.imageUrl} />
              <div className="field">
                <label>Label</label>
                <input
                  name="optionLabel"
                  value={option.label}
                  onChange={(e) =>
                    setOptions((opts) =>
                      opts.map((o, idx) => (idx === i ? { ...o, label: e.target.value } : o)),
                    )
                  }
                  placeholder="B · Calm hierarchy"
                />
              </div>
              <div className="field">
                <label>Caption</label>
                <input
                  name="optionCaption"
                  value={option.caption}
                  onChange={(e) =>
                    setOptions((opts) =>
                      opts.map((o, idx) =>
                        idx === i ? { ...o, caption: e.target.value } : o,
                      ),
                    )
                  }
                />
              </div>
              <div className="field md:col-span-2">
                <label>Job this option must do</label>
                <input
                  name="optionJobs"
                  value={option.jobs}
                  onChange={(e) =>
                    setOptions((opts) =>
                      opts.map((o, idx) => (idx === i ? { ...o, jobs: e.target.value } : o)),
                    )
                  }
                />
              </div>
              <div className="field md:col-span-2">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*,.svg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file, i);
                  }}
                />
                {option.imageUrl ? (
                  <p className="text-xs text-muted">{option.imageUrl}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary mt-3"
          onClick={() =>
            setOptions((o) => [...o, { label: "", caption: "", jobs: "", imageUrl: "" }])
          }
        >
          Add option
        </button>
      </section>

      <section>
        <h2 className="serif mb-3 text-2xl">Rubric</h2>
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr_80px]">
              <div className="field">
                <label>Name</label>
                <input
                  name="criterionName"
                  value={c.name}
                  onChange={(e) =>
                    setCriteria((rows) =>
                      rows.map((row, idx) =>
                        idx === i ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
              <div className="field">
                <label>What good looks like</label>
                <input
                  name="criterionDescription"
                  value={c.description}
                  onChange={(e) =>
                    setCriteria((rows) =>
                      rows.map((row, idx) =>
                        idx === i ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
              <div className="field">
                <label>Weight</label>
                <input
                  name="criterionWeight"
                  type="number"
                  step="0.1"
                  value={c.weight}
                  onChange={(e) =>
                    setCriteria((rows) =>
                      rows.map((row, idx) =>
                        idx === i ? { ...row, weight: Number(e.target.value) } : row,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="serif mb-3 text-2xl">Voters</h2>
          <div className="panel max-h-72 space-y-2 overflow-auto p-4">
            {people.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="voterIds" value={p.id} defaultChecked={p.role !== "VIEWER"} />
                <span>
                  {p.name}
                  <span className="block text-xs text-muted">{p.title}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <h2 className="serif mb-3 text-2xl">Viewers</h2>
          <div className="panel max-h-72 space-y-2 overflow-auto p-4">
            {people.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="viewerIds"
                  value={p.id}
                  defaultChecked={p.role === "VIEWER"}
                />
                <span>
                  {p.name}
                  <span className="block text-xs text-muted">{p.title}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}
