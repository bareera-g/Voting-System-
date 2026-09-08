"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";

type Person = { name: string; email: string };

export function LoginForm({
  next,
  people,
}: {
  next: string;
  people: Person[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPendingEmail(String(formData.get("email") || ""));
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPendingEmail(null);
    }
  }

  return (
    <div className="space-y-2">
      {people.map((p) => (
        <form key={p.email} action={onSubmit}>
          <input type="hidden" name="next" value={next || "/"} />
          <input type="hidden" name="email" value={p.email} />
          <input type="hidden" name="password" value="cerebri" />
          <button
            className="panel w-full px-5 py-4 text-left transition hover:border-teal"
            type="submit"
            disabled={pendingEmail !== null}
          >
            <span className="block font-medium">
              {pendingEmail === p.email ? "Signing in…" : p.name}
            </span>
          </button>
        </form>
      ))}
      {error ? <p className="pt-2 text-sm text-alert">{error}</p> : null}
    </div>
  );
}
