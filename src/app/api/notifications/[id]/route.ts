import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return notFound("Notification");
    if (existing.userId !== user.id) return forbidden();

    const notification = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return ok(notification);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
