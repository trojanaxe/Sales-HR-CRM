import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const existing = await prisma.area.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Area not found." }, { status: 404 });
  }

  const data: { name?: string; enabled?: boolean; cityId?: string } = {};

  if (body?.cityId !== undefined) {
    const cityId = typeof body.cityId === "string" ? body.cityId : "";
    if (!cityId) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      return NextResponse.json({ error: "Selected city does not exist." }, { status: 400 });
    }
    data.cityId = cityId;
  }

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Area name cannot be empty." }, { status: 400 });
    }
    data.name = name;
  }

  if (data.name !== undefined || data.cityId !== undefined) {
    const targetCityId = data.cityId ?? existing.cityId;
    const targetName = data.name ?? existing.name;
    const duplicate = await prisma.area.findUnique({
      where: { cityId_name: { cityId: targetCityId, name: targetName } },
    });
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json(
        { error: `Area "${targetName}" already exists in this city.` },
        { status: 409 },
      );
    }
  }

  if (body?.enabled !== undefined) {
    data.enabled = Boolean(body.enabled);
  }

  await prisma.area.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.area.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Area not found." }, { status: 404 });
  }

  try {
    await prisma.area.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Can't delete this area — it still has listings assigned to it. Move or delete those listings first, or disable the area instead.",
        },
        { status: 409 },
      );
    }
    throw e;
  }
}
