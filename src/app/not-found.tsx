import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="serif text-3xl">Nothing here</h1>
      <p className="mt-3 text-muted">That page is gone, or you don’t have it.</p>
      <Link href="/" className="mt-8 inline-block text-sm font-medium underline">
        Back to votes
      </Link>
    </main>
  );
}
