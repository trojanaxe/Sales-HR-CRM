import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/auth";
import { ok, error, unauthorized, forbidden, serverError } from "@/lib/api";
import { createAccount, findDuplicateAccounts } from "@/lib/accounts/service";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const accounts = await prisma.account.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { domain: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { contacts: true, requirements: true } },
      },
      orderBy: { name: "asc" },
    });

    return ok(accounts);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("sales", "admin");
    const body = await req.json();
    const { name, domain, website, industry, notes, resolution } = body;

    if (!name || !name.trim()) return error("name is required");

    // First pass: warn about likely duplicates instead of silently creating
    // a second Account for the same company (mirrors the resume-upload
    // duplicate-resolution flow in src/lib/resume/service.ts).
    if (!resolution) {
      const duplicates = await findDuplicateAccounts(name, domain);
      if (duplicates.length > 0) {
        return ok({ status: "duplicate", duplicates }, 200);
      }
    }

    if (resolution?.action === "use_existing") {
      const existing = await prisma.account.findUnique({ where: { id: resolution.accountId } });
      if (!existing) return error("Selected existing account not found", 404);
      return ok({ status: "linked", account: existing }, 200);
    }

    const account = await createAccount({ name, domain, website, industry, notes }, user.id);
    return ok({ status: "created", account }, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Forbidden") return forbidden();
    return serverError(e);
  }
}
