import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/api";
import { CandidateSource } from "@prisma/client";

const VALID_SOURCES: CandidateSource[] = ["bench", "external", "referral", "other"];

// Editable candidate fields only — deliberately NOT a spread of the raw
// request body. The candidate detail page passes the full GET response
// (owner, resumes, notes, pipelineEntries, collaborators, sdrId-style FKs,
// etc.) back into the edit form's state, and Prisma's checked update input
// rejects relation objects/foreign-key scalars passed that way. Whitelisting
// here is the actual fix, not a workaround — see .agents/decisions.md.
const EDITABLE_FIELDS = [
  "name", "email", "phone", "linkedIn", "currentLocation", "willingToRelocate",
  "skills", "certifications", "experience", "visaStatus", "source", "sourceDetail",
  "currentJobTitle", "noticePeriod", "currentCTC", "expectedCTC",
] as const;

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

    if (body.source !== undefined && !VALID_SOURCES.includes(body.source)) {
      return error(`source must be one of: ${VALID_SOURCES.join(", ")}`);
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (data.experience !== undefined) {
      data.experience = data.experience === "" || data.experience === null ? null : parseFloat(data.experience as string);
    }
    if (data.willingToRelocate !== undefined) data.willingToRelocate = Boolean(data.willingToRelocate);

    const updated = await prisma.candidate.update({
      where: { id },
      data,
      include,
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
