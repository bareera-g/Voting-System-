import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { User } from "@prisma/client";

export function AppShell({
  user,
  tab = "vote",
  children,
}: {
  user: User;
  tab?: "vote" | "board";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="serif text-lg tracking-tight">
            Cerebri AI
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/"
              className={tab === "vote" ? "font-medium text-ink" : "text-muted hover:text-ink"}
            >
              Vote
            </Link>
            <Link
              href="/board"
              className={tab === "board" ? "font-medium text-ink" : "text-muted hover:text-ink"}
            >
              Board
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
            <form action={logoutAction}>
              <button type="submit" className="hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>
    </div>
  );
}
