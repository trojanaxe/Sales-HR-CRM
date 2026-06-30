import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/api";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const RESUME_DIR =
  process.env.RESUME_STORAGE_PATH ||
  join(process.cwd(), "uploads", "resumes");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return notFound("Candidate");

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    if (!file) return error("No file uploaded");

    const ext = extname(file.name) || ".pdf";
    const filename = `${randomUUID()}${ext}`;
    const candidateDir = join(RESUME_DIR, id);
    await mkdir(candidateDir, { recursive: true });
    const filePath = join(candidateDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Mark previous as inactive
    await prisma.resume.updateMany({
      where: { candidateId: id, isActive: true },
      data: { isActive: false },
    });

    const resume = await prisma.resume.create({
      data: {
        candidateId: id,
        filePath,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        isActive: true,
      },
    });

    // Add a note about the upload
    await prisma.note.create({
      data: {
        body: `Resume uploaded: ${file.name}`,
        authorId: user.id,
        candidateId: id,
      },
    });

    return ok(resume, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
