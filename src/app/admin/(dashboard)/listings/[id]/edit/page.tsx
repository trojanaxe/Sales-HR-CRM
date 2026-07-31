import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/types";
import { ListingForm } from "@/components/admin/ListingForm";

export const metadata = { title: "Edit Listing — Homespy Admin" };
export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
      <p className="mt-1 text-sm text-gray-500">{listing.propertyId}</p>
      <div className="mt-6">
        <ListingForm listing={serializeListing(listing)} />
      </div>
    </div>
  );
}
