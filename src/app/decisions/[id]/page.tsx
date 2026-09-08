import { redirect } from "next/navigation";

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/decisions/${id}/ballot`);
}
