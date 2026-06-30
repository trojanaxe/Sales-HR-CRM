import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/api";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return error("Email and password required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return error("Invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return error("Invalid credentials", 401);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
