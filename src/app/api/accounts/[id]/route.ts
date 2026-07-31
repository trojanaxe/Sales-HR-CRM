import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/api";
import { normalizeAccountName, normalizeDomain } from "@/lib/accounts/service";

const include = {
  createdBy: { select: { id: true, name: true } },
  contacts: { orderBy: { createdAt: "asc" as const } },
  requirements: {
    include: {
      sdr: { select: { id: true, name: true } },
      assignedHR: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
    orderBy: { dateAdded: "desc" as const },
  },
  _count: { select: { contacts: true, requirements: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id }, include });
    if (!account) return notFound("Account");
    return ok(account);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("sales", "admin");
    const { id } = await params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) return notFound("Account");

    const body = await req.json();
    const { name, domain, website, industry, notes } = body;
    if (name !== undefined && !name.trim()) return error("name cannot be empty");

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim(), normalizedName: normalizeAccountName(name) } : {}),
        ...(domain !== undefined ? { domain: domain ? normalizeDomain(domain) : null } : {}),
        ...(website !== undefined ? { website: website || null } : {}),
        ...(industry !== undefined ? { industry: industry || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      include,
    });
    return ok(account);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
