export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "OPEN":
      return "Open";
    case "QUORUM_MET":
      return "Quorum met";
    case "CLOSED":
      return "Closed";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

export function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Facilitator";
    case "VOTER":
      return "Voter";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

export function scoreTone(score: number) {
  if (score >= 4.2) return "high";
  if (score >= 3.2) return "mid";
  if (score > 0) return "low";
  return "empty";
}
