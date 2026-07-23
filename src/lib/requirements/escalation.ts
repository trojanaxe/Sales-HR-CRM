import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/service";

export const CLAIM_SLA_MS = 3 * 60 * 60 * 1000; // 3 hours

// Recomputed from DB state every run rather than a per-requirement in-memory
// timer, so a server restart (or a serverless cold start) can't lose track
// of a pending SLA — the "available since" timestamp is the source of
// truth, not a live setTimeout. Called on an interval from instrumentation.ts
// and gated by claimEscalatedAt so the same miss never re-fires (Part 6).
export async function checkAndEscalateOverdueRequirements() {
  const cutoff = new Date(Date.now() - CLAIM_SLA_MS);

  const overdue = await prisma.requirement.findMany({
    where: {
      assignedHRId: null,
      claimEscalatedAt: null,
      availableSince: { lte: cutoff },
      status: { notIn: ["closed_won", "closed_lost"] },
    },
    include: { account: { select: { name: true } } },
  });

  if (overdue.length === 0) return { escalated: 0 };

  const recipients = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["admin", "hr"] } },
    select: { id: true },
  });

  for (const req of overdue) {
    const elapsedMs = Date.now() - req.availableSince.getTime();
    const elapsedHours = (elapsedMs / (60 * 60 * 1000)).toFixed(1);
    const accountName = req.account?.name || req.clientGroup;
    const title = `Unclaimed requirement: ${req.reqId}`;
    const body = `${req.reqId} (${accountName}) has been unclaimed for ${elapsedHours}h — past the 3-hour claim SLA. Available since ${req.availableSince.toLocaleString()}.`;
    const emailHtml = `
      <p><strong>${req.reqId}</strong> has exceeded the 3-hour claim SLA.</p>
      <ul>
        <li>Client / Account: ${accountName}</li>
        <li>Available since: ${req.availableSince.toLocaleString()}</li>
        <li>Time elapsed: ${elapsedHours} hours</li>
        <li>Current claim status: Unclaimed</li>
      </ul>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/requirements/${req.id}">View requirement</a></p>
    `;

    await Promise.all(
      recipients.map((r) =>
        createNotification({
          userId: r.id,
          type: "requirement_escalation",
          title,
          body,
          requirementId: req.id,
          emailHtml,
        })
      )
    );

    await prisma.requirement.update({ where: { id: req.id }, data: { claimEscalatedAt: new Date() } });
  }

  return { escalated: overdue.length };
}
