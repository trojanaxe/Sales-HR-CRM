import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, ok, serverError, unauthorized } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const profile = await prisma.resumeProfile.findFirst({
      where: { candidateId: id, resume: { isActive: true } },
      orderBy: { parsedAt: "desc" },
    });
    if (!profile) return notFound("Resume profile");

    return ok(profile);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
