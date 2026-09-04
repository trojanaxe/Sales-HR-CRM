import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const existing = await prisma.pricingTier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pricing tier not found." }, { status: 404 });
  }

  const data: {
    price?: number;
    label?: string;
    description?: string;
    sortOrder?: number;
    enabled?: boolean;
  } = {};

  if (body?.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid number." }, { status: 400 });
    }
    data.price = Math.round(price);
  }

  if (body?.label !== undefined) {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) {
      return NextResponse.json({ error: "Label cannot be empty." }, { status: 400 });
    }
    data.label = label;
  }

  if (body?.description !== undefined) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) {
      return NextResponse.json({ error: "Description cannot be empty." }, { status: 400 });
    }
    data.description = description;
  }

  if (body?.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "Sort order must be a number." }, { status: 400 });
    }
    data.sortOrder = sortOrder;
  }

  if (body?.enabled !== undefined) {
    data.enabled = Boolean(body.enabled);
  }

  await prisma.pricingTier.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.pricingTier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pricing tier not found." }, { status: 404 });
  }

  await prisma.pricingTier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
