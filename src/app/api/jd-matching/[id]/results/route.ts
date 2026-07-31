import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  getMinMatchScore,
  JDNotUploadedError,
  rankCandidatesForAdhocJD,
} from "@/lib/resume/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;

    const jd = await prisma.adhocJD.findUnique({ where: { id } });
    if (!jd) return notFound("JD search");
    if (user.role !== "admin" && jd.createdById !== user.id) return forbidden();

    const minScoreParam = req.nextUrl.searchParams.get("minScore");
    const minScore = minScoreParam !== null ? parseFloat(minScoreParam) : await getMinMatchScore();

    const ranked = await rankCandidatesForAdhocJD(id, 200);
    const filtered = ranked.filter((r) => r.match.overallScore >= minScore);

    return ok({ minScore, total: ranked.length, results: filtered });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    if (e instanceof JDNotUploadedError) return notFound("Parsed JD");
    return serverError(e);
  }
}
