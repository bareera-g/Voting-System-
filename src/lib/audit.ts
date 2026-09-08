import { prisma } from "./prisma";

export async function audit(
  action: string,
  opts: {
    userId?: string | null;
    decisionId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  await prisma.auditEvent.create({
    data: {
      action,
      userId: opts.userId ?? null,
      decisionId: opts.decisionId ?? null,
      metadata: JSON.stringify(opts.metadata ?? {}),
    },
  });
}
