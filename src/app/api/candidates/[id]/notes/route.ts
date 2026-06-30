import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const { body } = await req.json();
    if (!body?.trim()) return error("Note body is required");

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return notFound("Candidate");

    const note = await prisma.note.create({
      data: { body, authorId: user.id, candidateId: id },
      include: { author: { select: { id: true, name: true } } },
    });
    return ok(note, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
