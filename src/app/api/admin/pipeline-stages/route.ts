import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    await requireRole("admin");
    const stages = await prisma.pipelineStage.findMany({ orderBy: { order: "asc" } });
    return ok(stages);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const { name } = await req.json();
    if (!name?.trim()) return error("name is required");
    const count = await prisma.pipelineStage.count();
    const stage = await prisma.pipelineStage.create({
      data: { name, order: count + 1 },
    });
    return ok(stage, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole("admin");
    const { id, name, isActive, order } = await req.json();
    const updated = await prisma.pipelineStage.update({
      where: { id },
      data: { name, isActive, order },
    });
    return ok(updated);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
