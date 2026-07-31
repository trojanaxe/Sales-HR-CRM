import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return ok({ notifications, unreadCount });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await req.json().catch(() => ({}));
    if (body.markAllRead) {
      await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
      return ok({ ok: true });
    }
    return ok({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
