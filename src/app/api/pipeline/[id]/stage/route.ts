import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const { stageId } = await req.json();
    if (!stageId) return error("stageId is required");

    const entry = await prisma.pipelineEntry.findUnique({ where: { id } });
    if (!entry) return notFound("Pipeline entry");

    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!stage) return notFound("Stage");

    // Update timestamps based on stage name
    const dateUpdates: Record<string, Date> = {};
    const lower = stage.name.toLowerCase();
    if (lower === "submitted") dateUpdates.submissionDate = new Date();
    if (lower === "offer") dateUpdates.offerDate = new Date();
    if (lower === "placed") dateUpdates.placementDate = new Date();

    const updated = await prisma.pipelineEntry.update({
      where: { id },
      data: { stageId, ...dateUpdates },
      include: {
        stage: true,
        candidate: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqId: true } },
      },
    });

    await prisma.pipelineStageHistory.create({
      data: { pipelineEntryId: id, stageId, changedById: user.id },
    });

    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
