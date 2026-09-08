import Link from "next/link";

export function CerebriLogo({
  href = "/",
  size = "md",
}: {
  href?: string;
  size?: "md" | "lg";
}) {
  const height = size === "lg" ? "h-11" : "h-8";
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Cerebri AI">
      {/* Official wordmark. mix-blend-multiply drops the black canvas on the grey page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-dark.png"
        alt="Cerebri"
        className={`${height} w-auto mix-blend-multiply`}
      />
    </Link>
  );
}
