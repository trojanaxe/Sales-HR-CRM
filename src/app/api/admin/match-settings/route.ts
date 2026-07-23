import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/auth";
import { error, ok, serverError, unauthorized } from "@/lib/api";
import { getMinMatchScore, setMinMatchScore } from "@/lib/resume/service";

export async function GET() {
  try {
    await requireSession();
    const minMatchScore = await getMinMatchScore();
    return ok({ minMatchScore });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    const { minMatchScore } = await req.json();
    if (typeof minMatchScore !== "number" || Number.isNaN(minMatchScore))
      return error("minMatchScore must be a number");
    if (minMatchScore < 0 || minMatchScore > 100)
      return error("minMatchScore must be between 0 and 100");

    const updated = await setMinMatchScore(minMatchScore, user.id);
    return ok({ minMatchScore: updated });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
