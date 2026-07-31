import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { error, ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("sales", "admin");
    const { id } = await params;
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) return notFound("Contact");

    const body = await req.json();
    const { name, role, email, phone, linkedIn } = body;
    if (name !== undefined && !name.trim()) return error("name cannot be empty");

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(role !== undefined ? { role: role || null } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(linkedIn !== undefined ? { linkedIn: linkedIn || null } : {}),
      },
    });
    return ok(contact);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
