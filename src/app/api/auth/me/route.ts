import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await getSession();
  if (!user) return unauthorized();
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
