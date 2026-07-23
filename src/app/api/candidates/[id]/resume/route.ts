import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/api";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { parseResumeAndPersist } from "@/lib/resume/service";

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

    const isReplacement = await prisma.resume.count({ where: { candidateId: id } }) > 0;

    const resume = await prisma.resume.create({
      data: {
        candidateId: id,
        filePath,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        isActive: true,
        uploadedById: user.id,
      },
    });

    // Add a note about the upload — doubles as the "who replaced the resume
    // and when" audit trail required for the HR submit-candidate workflow
    // (Resume.uploadedById + uploadedAt cover the same fact structurally,
    // this note just makes it visible in the activity thread).
    await prisma.note.create({
      data: {
        body: isReplacement
          ? `Resume replaced by ${user.name}: ${file.name}`
          : `Resume uploaded: ${file.name}`,
        authorId: user.id,
        candidateId: id,
      },
    });

    // Best-effort: extract a structured intelligence profile from the resume.
    // Unsupported formats or parse failures should not block the upload —
    // the file is already stored; parsing can be retried via
    // POST /api/resumes/[id]/parse.
    try {
      await parseResumeAndPersist(resume.id);
    } catch (parseError) {
      console.error("Resume auto-parse failed:", parseError);
    }

    return ok(resume, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
