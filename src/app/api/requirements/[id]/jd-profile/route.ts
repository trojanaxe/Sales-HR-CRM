import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { error, notFound, ok, serverError, unauthorized } from "@/lib/api";
import { JDNotUploadedError, parseJDAndPersist, ResumeNotFoundError } from "@/lib/resume/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const profile = await prisma.jDProfile.findUnique({ where: { requirementId: id } });
    if (!profile) return notFound("JD profile");
    return ok(profile);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("sales", "admin");
    const { id } = await params;
    const profile = await parseJDAndPersist(id);
    return ok(profile, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    if (e instanceof ResumeNotFoundError) return notFound("Requirement");
    if (e instanceof JDNotUploadedError) return error(e.message, 422);
    return serverError(e);
  }
}
