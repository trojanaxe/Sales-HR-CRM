import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireSession();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRequirements,
      openRequirements,
      unclaimedRequirements,
      totalCandidates,
      placementsThisMonth,
      pipelineByStage,
      reqsByPriority,
      reqsByStatus,
    ] = await Promise.all([
      prisma.requirement.count(
        user.role === "sales" ? { where: { sdrId: user.id } } : undefined
      ),
      prisma.requirement.count({
        where: {
          status: { in: ["open", "in_progress"] },
          ...(user.role === "sales" ? { sdrId: user.id } : {}),
        },
      }),
      prisma.requirement.count({ where: { assignedHRId: null, status: "open" } }),
      prisma.candidate.count(),
      prisma.pipelineEntry.count({
        where: {
          placementDate: { gte: startOfMonth },
        },
      }),
      prisma.pipelineEntry.groupBy({
        by: ["stageId"],
        _count: true,
        where:
          user.role === "hr"
            ? {
                requirement: { assignedHRId: user.id },
              }
            : {},
      }),
      prisma.requirement.groupBy({
        by: ["priority"],
        _count: true,
        where: user.role === "sales" ? { sdrId: user.id } : {},
      }),
      prisma.requirement.groupBy({
        by: ["status"],
        _count: true,
        where: user.role === "sales" ? { sdrId: user.id } : {},
      }),
    ]);

    // Hydrate stage names
    const stages = await prisma.pipelineStage.findMany();
    const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

    const pipelineSummary = pipelineByStage.map((g) => ({
      stageName: stageMap[g.stageId] || g.stageId,
      count: g._count,
    }));

    return ok({
      totalRequirements,
      openRequirements,
      unclaimedRequirements,
      totalCandidates,
      placementsThisMonth,
      pipelineSummary,
      reqsByPriority,
      reqsByStatus,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
