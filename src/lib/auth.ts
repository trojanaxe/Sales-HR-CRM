import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { User } from "@prisma/client";

export const SESSION_COOKIE = "sietrix_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function requireSession(): Promise<User> {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.isActive) {
    throw new Error("Account deactivated");
  }
  return user;
}

export async function requireRole(
  ...roles: Array<"admin" | "sales" | "hr">
): Promise<User> {
  const user = await requireSession();
  if (!roles.includes(user.role as "admin" | "sales" | "hr")) {
    throw new Error("Forbidden");
  }
  return user;
}
