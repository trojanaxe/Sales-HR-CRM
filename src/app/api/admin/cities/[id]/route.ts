import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "City not found." }, { status: 404 });
  }

  const data: { name?: string; enabled?: boolean } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "City name cannot be empty." }, { status: 400 });
    }
    const duplicate = await prisma.city.findUnique({ where: { name } });
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: `City "${name}" already exists.` }, { status: 409 });
    }
    data.name = name;
  }

  if (body?.enabled !== undefined) {
    data.enabled = Boolean(body.enabled);
  }

  await prisma.city.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "City not found." }, { status: 404 });
  }

  try {
    await prisma.city.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Can't delete this city — one or more of its areas still have listings. Move or delete those listings first, or disable the city instead.",
        },
        { status: 409 },
      );
    }
    throw e;
  }
}
