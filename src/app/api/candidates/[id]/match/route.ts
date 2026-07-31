import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { error, notFound, ok, serverError, unauthorized } from "@/lib/api";
import {
  JDNotUploadedError,
  matchCandidateAgainstRequirement,
  ResumeNotFoundError,
} from "@/lib/resume/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const requirementId = req.nextUrl.searchParams.get("requirementId");
    if (!requirementId) return error("requirementId query param is required");

    const match = await matchCandidateAgainstRequirement(id, requirementId);
    return ok(match);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof ResumeNotFoundError) return notFound("Resume profile");
    if (e instanceof JDNotUploadedError) return notFound("JD profile");
    return serverError(e);
  }
}
