import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return notFound("User");

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return ok(user);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
