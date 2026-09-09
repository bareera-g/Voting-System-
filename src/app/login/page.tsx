import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { CerebriLogo } from "@/components/CerebriLogo";
import { getSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const session = await getSession();
  if (session) redirect(destination);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <CerebriLogo size="lg" href="/login" />
      <p className="mt-6 text-sm font-medium text-teal">AIQ card designs</p>
      <h1 className="serif mt-2 text-4xl">Vote</h1>
      <p className="mt-3 mb-6 text-muted">Enter your name to start.</p>
      <LoginForm next={destination} />
      <p className="mt-10 text-xs text-muted">© Cerebri AI Inc.</p>
    </main>
  );
}
