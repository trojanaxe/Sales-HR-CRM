import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const groups = await prisma.requirement.findMany({
      select: { clientGroup: true },
      distinct: ["clientGroup"],
      orderBy: { clientGroup: "asc" },
    });
    return ok(groups.map((g) => g.clientGroup));
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
