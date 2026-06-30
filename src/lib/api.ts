import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function serverError(e: unknown) {
  console.error(e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function withAuth(
  handler: (req: Request, user: import("@prisma/client").User) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const { requireSession } = await import("./auth");
      const user = await requireSession();
      return handler(req, user);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === "Unauthorized") return unauthorized();
        if (e.message === "Forbidden") return forbidden();
        if (e.message === "Account deactivated")
          return error("Account deactivated", 403);
      }
      return serverError(e);
    }
  };
}
