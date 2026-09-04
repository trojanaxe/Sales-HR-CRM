import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const cityId = typeof body?.cityId === "string" ? body.cityId : "";

  if (!name) {
    return NextResponse.json({ error: "Area name is required." }, { status: 400 });
  }
  if (!cityId) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) {
    return NextResponse.json({ error: "Selected city does not exist." }, { status: 400 });
  }

  const existing = await prisma.area.findUnique({
    where: { cityId_name: { cityId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Area "${name}" already exists in ${city.name}.` },
      { status: 409 },
    );
  }

  const area = await prisma.area.create({ data: { name, cityId, enabled: true } });
  return NextResponse.json({ id: area.id }, { status: 201 });
}
