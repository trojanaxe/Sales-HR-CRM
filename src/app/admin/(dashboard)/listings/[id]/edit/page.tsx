import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeListing, LISTING_WITH_AREA_INCLUDE } from "@/lib/types";
import { getAllCitiesWithAreas } from "@/lib/areas";
import { ListingForm } from "@/components/admin/ListingForm";

export const metadata = { title: "Edit Listing — Homespy Admin" };
export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, cities] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, include: LISTING_WITH_AREA_INCLUDE }),
    getAllCitiesWithAreas(),
  ]);
  if (!listing) notFound();

  return (
    <div>
      <h1 className="font-whisper text-heading-sm text-ink">Edit Listing</h1>
      <p className="mt-2 text-body-sm text-ink-muted">{listing.propertyId}</p>
      <div className="mt-6">
        <ListingForm listing={serializeListing(listing)} cities={cities} />
      </div>
    </div>
  );
}
