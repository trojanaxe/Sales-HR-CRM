import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return ok(stages);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
