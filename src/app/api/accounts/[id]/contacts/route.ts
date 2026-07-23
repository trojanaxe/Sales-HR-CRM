import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("sales", "admin");
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return notFound("Account");

    const body = await req.json();
    const { name, role, email, phone, linkedIn } = body;
    if (!name || !name.trim()) return error("name is required");

    const contact = await prisma.contact.create({
      data: {
        accountId: id,
        name: name.trim(),
        role: role || null,
        email: email || null,
        phone: phone || null,
        linkedIn: linkedIn || null,
        createdById: user.id,
      },
    });
    return ok(contact, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
