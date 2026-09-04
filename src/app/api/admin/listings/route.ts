import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateListingInput } from "@/lib/validate-listing";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateListingInput(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [existing, area] = await Promise.all([
    prisma.listing.findUnique({ where: { propertyId: result.data.propertyId } }),
    prisma.area.findUnique({ where: { id: result.data.areaId } }),
  ]);

  if (existing) {
    return NextResponse.json(
      { error: `Property ID "${result.data.propertyId}" is already in use.` },
      { status: 409 },
    );
  }

  if (!area) {
    return NextResponse.json({ error: "Selected area does not exist." }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      ...result.data,
      images: JSON.stringify(result.data.images),
    },
  });

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
