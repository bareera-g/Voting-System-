import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/LoginForm";
import { CerebriLogo } from "@/components/CerebriLogo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  let people: { name: string; email: string }[] = [];
  try {
    people = await prisma.user.findMany({
      where: { role: { not: "VIEWER" } },
      orderBy: { name: "asc" },
      select: { name: true, email: true },
    });
  } catch (error) {
    console.error("Failed to load voter roster", error);
    people = [];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <CerebriLogo size="lg" href="/login" />
      <p className="mt-6 text-sm font-medium text-teal">AIQ card designs</p>
      <h1 className="serif mt-2 text-4xl">Vote</h1>
      <p className="mt-3 mb-6 text-muted">Tap your name to start.</p>
      {people.length === 0 ? (
        <p className="text-sm text-muted">
          The voter list couldn&apos;t be loaded. Refresh the page, or try again
          in a minute.
        </p>
      ) : (
        <LoginForm next={next || "/"} people={people} />
      )}
      <p className="mt-10 text-xs text-muted">© Cerebri AI Inc.</p>
    </main>
  );
}
