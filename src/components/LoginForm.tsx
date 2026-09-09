"use client";

import { useState, type FormEvent } from "react";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const name = new FormData(form).get("name");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, next: next || "/" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        next?: string;
      };

      if (!response.ok) {
        setError(data.error || "Couldn’t sign you in.");
        setPending(false);
        return;
      }

      window.location.assign(data.next || "/");
    } catch {
      setError("Couldn’t sign you in. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          required
          minLength={2}
          maxLength={100}
          placeholder="Enter your name"
        />
      </div>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </button>
      {error ? <p className="pt-2 text-sm text-alert">{error}</p> : null}
    </form>
  );
}
