"use client";

import { useEffect, useMemo, useState } from "react";

type Option = {
  id: string;
  label: string;
  caption: string;
  jobs: string;
  imageUrl: string;
};

export function CompareView({ options }: { options: Option[] }) {
  const [left, setLeft] = useState(options[0]?.id ?? "");
  const [right, setRight] = useState(options[1]?.id ?? options[0]?.id ?? "");
  const [zoom, setZoom] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const leftOpt = useMemo(() => options.find((o) => o.id === left), [options, left]);
  const rightOpt = useMemo(
    () => options.find((o) => o.id === right),
    [options, right],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoom(null);
      if (!zoom) return;
      const idx = options.findIndex((o) => o.id === zoom);
      if (e.key === "ArrowRight") {
        setZoom(options[(idx + 1) % options.length]?.id ?? zoom);
        setScale(1);
      }
      if (e.key === "ArrowLeft") {
        setZoom(options[(idx - 1 + options.length) % options.length]?.id ?? zoom);
        setScale(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, options]);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { value: left, set: setLeft, option: leftOpt },
          { value: right, set: setRight, option: rightOpt },
        ].map((slot, i) => (
          <div key={i} className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <select
                className="w-full bg-transparent text-sm"
                value={slot.value}
                onChange={(e) => slot.set(e.target.value)}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {slot.option ? (
              <button
                type="button"
                className="block w-full"
                onClick={() => {
                  setZoom(slot.option!.id);
                  setScale(1);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.option.imageUrl}
                  alt={slot.option.label}
                  className="h-[380px] w-full bg-paper-2 object-contain object-top"
                />
              </button>
            ) : null}
            <div className="px-4 py-4">
              <p className="text-sm text-muted">{slot.option?.caption}</p>
              <p className="mt-2 text-sm">{slot.option?.jobs}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Click a card to zoom. In the lightbox: scroll to zoom, arrows to move, Esc to close.
      </p>
      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2332]/85 p-6"
          onClick={() => setZoom(null)}
          onWheel={(e) => {
            e.preventDefault();
            setScale((s) => Math.min(3, Math.max(1, s + (e.deltaY > 0 ? -0.15 : 0.15))));
          }}
        >
          <div className="max-h-full max-w-6xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={options.find((o) => o.id === zoom)?.imageUrl}
              alt="Zoomed card"
              style={{ transform: `scale(${scale})`, transformOrigin: "center top" }}
              className="w-full rounded-2xl transition-transform"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
