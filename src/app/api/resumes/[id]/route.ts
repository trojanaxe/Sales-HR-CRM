import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized, notFound, serverError } from "@/lib/api";
import { readFile } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) return notFound("Resume");

    const buffer = await readFile(resume.filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Disposition": `inline; filename="${resume.fileName}"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
