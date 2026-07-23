import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const jd = await prisma.adhocJD.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!jd) return notFound("JD search");
    if (user.role !== "admin" && jd.createdById !== user.id) return forbidden();
    return ok(jd);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("hr", "admin");
    const { id } = await params;
    const jd = await prisma.adhocJD.findUnique({ where: { id } });
    if (!jd) return notFound("JD search");
    if (user.role !== "admin" && jd.createdById !== user.id) return forbidden();
    await prisma.adhocJD.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
