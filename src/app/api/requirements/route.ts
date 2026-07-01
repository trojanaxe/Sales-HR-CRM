import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import { nextReqId } from "@/lib/ids";
import { notifyNewRequirement } from "@/lib/slack";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(req.url);

    const where: Record<string, unknown> = {};
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const clientGroup = searchParams.get("clientGroup");
    const assignedHRId = searchParams.get("assignedHRId");
    const unclaimed = searchParams.get("unclaimed");

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (clientGroup) where.clientGroup = { contains: clientGroup };
    if (unclaimed === "true") where.assignedHRId = null;
    if (assignedHRId) where.assignedHRId = assignedHRId;

    if (user.role === "sales") where.sdrId = user.id;

    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        sdr: { select: { id: true, name: true } },
        assignedHR: { select: { id: true, name: true } },
        contractMode: { select: { id: true, label: true } },
        collaborators: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { pipelineEntries: true, notes: true } },
      },
      orderBy: { dateAdded: "desc" },
    });

    return ok(requirements);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("sales", "admin");
    const body = await req.json();

    const {
      clientGroup, jobRole, priority, status, closingDate,
      vendor, contactName, contactRole, contactLinkedIn, contactEmail, contactPhone,
      experience, budget, location, contractModeId, industry,
      meetingStatus, jdReceived, jdLink, wonLostReason,
    } = body;

    if (!clientGroup || !jobRole) return error("clientGroup and jobRole are required");

    const reqId = await nextReqId();

    const requirement = await prisma.requirement.create({
      data: {
        reqId,
        sdrId: user.id,
        clientGroup,
        jobRole,
        priority: priority || "medium",
        status: status || "open",
        closingDate: closingDate ? new Date(closingDate) : undefined,
        vendor, contactName, contactRole, contactLinkedIn,
        contactEmail, contactPhone, experience, budget, location,
        contractModeId, industry, meetingStatus,
        jdReceived: Boolean(jdReceived),
        jdLink, wonLostReason,
      },
      include: {
        sdr: { select: { id: true, name: true } },
        contractMode: true,
      },
    });

    notifyNewRequirement({
      reqId: requirement.reqId,
      clientGroup: requirement.clientGroup,
      jobRole: requirement.jobRole,
      priority: requirement.priority,
      id: requirement.id,
    });

    return ok(requirement, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
