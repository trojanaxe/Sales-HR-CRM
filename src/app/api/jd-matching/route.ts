import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { error, ok, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createAndParseAdhocJD } from "@/lib/resume/service";

export async function GET() {
  try {
    const user = await requireRole("hr", "admin");
    const where = user.role === "admin" ? {} : { createdById: user.id };
    const searches = await prisma.adhocJD.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(searches);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("hr", "admin");
    const contentType = req.headers.get("content-type") || "";

    let title: string | undefined;
    let jdText: string | undefined;
    let file: { buffer: Buffer; fileName: string } | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string | null) || undefined;
      jdText = (formData.get("jdText") as string | null) || undefined;
      const uploaded = formData.get("jd") as File | null;
      if (uploaded) {
        file = { buffer: Buffer.from(await uploaded.arrayBuffer()), fileName: uploaded.name };
      }
    } else {
      const body = await req.json();
      title = body.title;
      jdText = body.jdText;
    }

    if (!jdText?.trim() && !file) return error("Either jdText or a JD file is required");
    if (jdText && jdText.length > 20000)
      return error("JD text is too long (max 20,000 characters)");

    const adhocJD = await createAndParseAdhocJD({ title, jdText, file, createdById: user.id });
    return ok(adhocJD, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
