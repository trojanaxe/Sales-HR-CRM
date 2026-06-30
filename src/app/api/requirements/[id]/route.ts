import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

const include = {
  sdr: { select: { id: true, name: true, email: true } },
  assignedHR: { select: { id: true, name: true, email: true } },
  contractMode: true,
  collaborators: { include: { user: { select: { id: true, name: true } } } },
  notes: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  pipelineEntries: {
    include: {
      candidate: { select: { id: true, candidateId: true, name: true, skills: true } },
      stage: true,
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const req = await prisma.requirement.findUnique({ where: { id }, include });
    if (!req) return notFound("Requirement");
    return ok(req);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return notFound("Requirement");

    // sales can only edit their own reqs; HR and admin can edit any
    if (user.role === "sales" && existing.sdrId !== user.id) return forbidden();

    const body = await req.json();
    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        ...body,
        closingDate: body.closingDate ? new Date(body.closingDate) : undefined,
        updatedAt: new Date(),
      },
      include,
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    if (user.role !== "admin") return forbidden();
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) return notFound("Requirement");
    await prisma.requirement.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
