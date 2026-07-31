import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { error, notFound, ok, serverError, unauthorized } from "@/lib/api";
import {
  parseResumeAndPersist,
  ResumeNotFoundError,
} from "@/lib/resume/service";
import { UnsupportedResumeFormatError } from "@/lib/resume/textExtract";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("hr", "admin");
    const { id } = await params;
    const profile = await parseResumeAndPersist(id);
    return ok(profile, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    if (e instanceof ResumeNotFoundError) return notFound("Resume");
    if (e instanceof UnsupportedResumeFormatError) return error(e.message, 422);
    return serverError(e);
  }
}
