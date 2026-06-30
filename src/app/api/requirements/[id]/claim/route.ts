import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

// POST /api/requirements/:id/claim  — claim or reassign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const requirement = await prisma.requirement.findUnique({ where: { id } });
    if (!requirement) return notFound("Requirement");

    // non-admin HR can only claim unclaimed reqs or their own
    if (
      user.role === "hr" &&
      requirement.assignedHRId &&
      requirement.assignedHRId !== user.id
    ) {
      return error("Requirement already claimed by another HR user", 409);
    }

    const assignTo = body.assignToId || user.id;

    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        assignedHRId: assignTo,
        claimedAt: new Date(),
        status: requirement.status === "open" ? "in_progress" : requirement.status,
      },
      include: {
        assignedHR: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}

// DELETE /api/requirements/:id/claim  — unclaim
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const requirement = await prisma.requirement.findUnique({ where: { id } });
    if (!requirement) return notFound("Requirement");

    if (user.role === "hr" && requirement.assignedHRId !== user.id) return forbidden();

    const updated = await prisma.requirement.update({
      where: { id },
      data: { assignedHRId: null, claimedAt: null },
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
