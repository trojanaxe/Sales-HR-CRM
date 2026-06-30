import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const JD_DIR =
  process.env.JD_STORAGE_PATH || join(process.cwd(), "uploads", "jd");

export async function POST(req: NextRequest) {
  try {
    await requireRole("sales", "admin");
    const formData = await req.formData();
    const file = formData.get("jd") as File | null;
    const requirementId = formData.get("requirementId") as string | null;

    if (!file) return error("No file uploaded");
    if (!requirementId) return error("requirementId is required");

    const ext = extname(file.name) || ".pdf";
    const filename = `${randomUUID()}${ext}`;
    await mkdir(JD_DIR, { recursive: true });
    const filePath = join(JD_DIR, filename);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const updated = await prisma.requirement.update({
      where: { id: requirementId },
      data: { jdFilePath: filePath, jdReceived: true },
    });

    return ok({ filePath: updated.jdFilePath });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
