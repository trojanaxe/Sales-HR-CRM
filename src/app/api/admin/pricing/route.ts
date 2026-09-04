import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const price = Number(body?.price);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0;

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Price must be a valid number." }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const tier = await prisma.pricingTier.create({
    data: { price: Math.round(price), label, description, sortOrder, enabled: true },
  });

  return NextResponse.json({ id: tier.id }, { status: 201 });
}
