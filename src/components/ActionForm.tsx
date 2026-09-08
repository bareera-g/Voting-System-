"use client";

import { useState } from "react";

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      action={async (formData) => {
        setError(null);
        const result = await action(formData);
        if (result && "error" in result && result.error) setError(result.error);
      }}
    >
      {children}
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
    </form>
  );
}
