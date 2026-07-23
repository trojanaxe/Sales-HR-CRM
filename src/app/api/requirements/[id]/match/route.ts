import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { notFound, ok, serverError, unauthorized } from "@/lib/api";
import { JDNotUploadedError, rankCandidatesForRequirement } from "@/lib/resume/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

    const ranked = await rankCandidatesForRequirement(id, limit);
    return ok(ranked);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof JDNotUploadedError) return notFound("JD profile");
    return serverError(e);
  }
}
