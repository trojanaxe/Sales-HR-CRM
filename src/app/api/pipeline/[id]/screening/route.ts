import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hr", "admin");
    const { id } = await params;

    const screenings = await prisma.hRScreening.findMany({
      where: { pipelineEntryId: id },
      include: { conductedBy: { select: { id: true, name: true } } },
      orderBy: { conductedAt: "desc" },
    });
    return ok(screenings);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const { responses, notes } = await req.json();

    if (!responses) return error("responses is required");

    const entry = await prisma.pipelineEntry.findUnique({ where: { id } });
    if (!entry) return notFound("Pipeline entry");

    const screening = await prisma.hRScreening.create({
      data: {
        pipelineEntryId: id,
        conductedById: user.id,
        responses,
        notes: notes || null,
      },
      include: { conductedBy: { select: { id: true, name: true } } },
    });
    return ok(screening, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const { screeningId, responses, notes } = await req.json();
    if (!screeningId) return error("screeningId is required");

    const screening = await prisma.hRScreening.findFirst({
      where: { id: screeningId, pipelineEntryId: id },
    });
    if (!screening) return notFound("Screening");
    if (screening.conductedById !== user.id && user.role !== "admin")
      return error("Not authorized to edit this screening", 403);

    const updated = await prisma.hRScreening.update({
      where: { id: screeningId },
      data: { responses, notes },
      include: { conductedBy: { select: { id: true, name: true } } },
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
