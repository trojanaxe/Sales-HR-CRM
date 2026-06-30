import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

const include = {
  owner: { select: { id: true, name: true } },
  collaborators: { include: { user: { select: { id: true, name: true } } } },
  resumes: { orderBy: { uploadedAt: "desc" as const } },
  notes: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  pipelineEntries: {
    include: {
      requirement: { select: { id: true, reqId: true, clientGroup: true, jobRole: true } },
      stage: true,
    },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const candidate = await prisma.candidate.findUnique({ where: { id }, include });
    if (!candidate) return notFound("Candidate");
    return ok(candidate);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const existing = await prisma.candidate.findUnique({ where: { id } });
    if (!existing) return notFound("Candidate");
    if (user.role === "sales") return forbidden();

    const body = await req.json();
    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        ...body,
        experience: body.experience ? parseFloat(body.experience) : undefined,
        updatedAt: new Date(),
      },
      include,
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
