import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "City name is required." }, { status: 400 });
  }

  const existing = await prisma.city.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: `City "${name}" already exists.` }, { status: 409 });
  }

  const city = await prisma.city.create({ data: { name, enabled: true } });
  return NextResponse.json({ id: city.id }, { status: 201 });
}
