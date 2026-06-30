import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const requirementId = searchParams.get("requirementId");
    const candidateId = searchParams.get("candidateId");
    const stageId = searchParams.get("stageId");

    const where: Record<string, unknown> = {};
    if (requirementId) where.requirementId = requirementId;
    if (candidateId) where.candidateId = candidateId;
    if (stageId) where.stageId = stageId;

    const entries = await prisma.pipelineEntry.findMany({
      where,
      include: {
        candidate: {
          select: { id: true, candidateId: true, name: true, skills: true, experience: true, currentLocation: true },
        },
        requirement: {
          select: { id: true, reqId: true, clientGroup: true, jobRole: true, priority: true },
        },
        stage: true,
        interviewDates: { orderBy: { scheduledAt: "asc" } },
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(entries);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("hr", "admin");
    const body = await req.json();

    const { candidateIds, requirementId, stageId, notes: noteText } = body;

    // Support single or multiple candidates
    const ids: string[] = Array.isArray(candidateIds)
      ? candidateIds
      : body.candidateId
        ? [body.candidateId]
        : [];

    if (ids.length === 0 || !requirementId)
      return error("candidateId(s) and requirementId are required");

    const stage = stageId
      ? await prisma.pipelineStage.findUnique({ where: { id: stageId } })
      : await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } });

    if (!stage) return error("Pipeline stage not found");

    const created = await Promise.all(
      ids.map(async (candidateId) => {
        const entry = await prisma.pipelineEntry.create({
          data: {
            candidateId,
            requirementId,
            stageId: stage.id,
            submissionDate: new Date(),
          },
          include: {
            candidate: { select: { id: true, name: true } },
            stage: true,
          },
        });

        await prisma.pipelineStageHistory.create({
          data: {
            pipelineEntryId: entry.id,
            stageId: stage.id,
            changedById: user.id,
          },
        });

        if (noteText) {
          await prisma.note.create({
            data: {
              body: noteText,
              authorId: user.id,
              pipelineEntryId: entry.id,
            },
          });
        }

        return entry;
      })
    );

    return ok(created, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
