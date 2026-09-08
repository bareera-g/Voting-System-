import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/guard";
import { AppShell } from "@/components/AppShell";
import { isOpen } from "@/lib/access";

export default async function HomePage() {
  const user = await requirePageUser();
  const invitations = await prisma.invitation.findMany({
    where: { userId: user.id, role: "VOTER" },
    include: {
      decision: { include: { ballots: true } },
    },
  });

  const open = invitations
    .filter((i) => isOpen(i.decision.status))
    .sort((a, b) => a.decision.streamOrder - b.decision.streamOrder);

  const todo = open.filter(
    (i) => !i.decision.ballots.some((b) => b.userId === user.id && b.submittedAt),
  );
  const done = open.filter((i) =>
    i.decision.ballots.some((b) => b.userId === user.id && b.submittedAt),
  );

  const heading =
    invitations.length === 0
      ? "Nothing to vote on."
      : todo.length === 0
        ? "You’re done. Thank you."
        : todo.length === 1
          ? "One left."
          : `${todo.length} left.`;

  return (
    <AppShell user={user} tab="vote">
      <h1 className="serif text-4xl">Hi, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-muted">{heading}</p>

      {todo.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {todo.map((i) => (
            <li key={i.id}>
              <Link
                href={`/decisions/${i.decision.id}/ballot`}
                className="panel flex items-center justify-between gap-4 p-5 transition hover:border-teal"
              >
                <h2 className="serif text-xl">{i.decision.title}</h2>
                <span className="text-sm text-teal">Vote</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <ul className="mt-10 space-y-1">
          {done.map((i) => (
            <li key={i.id}>
              <Link
                href={`/decisions/${i.decision.id}/ballot`}
                className="flex items-center justify-between px-1 py-2 text-sm text-muted hover:text-ink"
              >
                <span>{i.decision.title}</span>
                <span>Done</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
