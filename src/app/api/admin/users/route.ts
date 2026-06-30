import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, error, unauthorized, serverError } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireRole("admin");
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return ok(users);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password || !role) return error("All fields are required");
    if (!["admin", "sales", "hr"].includes(role)) return error("Invalid role");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error("Email already in use", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return ok(user, 201);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden"))
      return unauthorized();
    return serverError(e);
  }
}
