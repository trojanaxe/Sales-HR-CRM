import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const modes = await prisma.contractMode.findMany({
      orderBy: { order: "asc" },
    });
    return ok(modes);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole("admin");
    const { id, isActive } = await req.json();
    if (!id) return error("id is required");
    const mode = await prisma.contractMode.update({
      where: { id },
      data: { isActive },
    });
    return ok(mode);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const { label } = await req.json();
    if (!label?.trim()) return error("label is required");

    const count = await prisma.contractMode.count();
    const mode = await prisma.contractMode.create({
      data: { label, order: count + 1 },
    });
    return ok(mode, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
