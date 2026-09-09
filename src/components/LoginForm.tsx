"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next || "/"} />
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
          placeholder="Enter your full name"
        />
      </div>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </button>
      {error ? <p className="pt-2 text-sm text-alert">{error}</p> : null}
    </form>
  );
}
