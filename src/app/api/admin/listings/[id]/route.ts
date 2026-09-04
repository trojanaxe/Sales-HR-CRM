import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { validateListingInput } from "@/lib/validate-listing";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = validateListingInput(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const [duplicate, area] = await Promise.all([
    prisma.listing.findUnique({ where: { propertyId: result.data.propertyId } }),
    prisma.area.findUnique({ where: { id: result.data.areaId } }),
  ]);

  if (duplicate && duplicate.id !== id) {
    return NextResponse.json(
      { error: `Property ID "${result.data.propertyId}" is already in use.` },
      { status: 409 },
    );
  }

  if (!area) {
    return NextResponse.json({ error: "Selected area does not exist." }, { status: 400 });
  }

  await prisma.listing.update({
    where: { id },
    data: {
      ...result.data,
      images: JSON.stringify(result.data.images),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await prisma.listing.delete({ where: { id } });

  // Best-effort cleanup of locally uploaded images (ignores external/sample URLs).
  try {
    const images: string[] = JSON.parse(existing.images);
    await Promise.all(
      images
        .filter((url) => url.startsWith("/uploads/"))
        .map((url) => unlink(path.join(process.cwd(), "public", url)).catch(() => {})),
    );
  } catch {
    // Non-fatal: listing is already deleted.
  }

  return NextResponse.json({ ok: true });
}
