import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeListing, AVAILABILITY_LABELS, AVAILABILITY_STYLES } from "@/lib/types";
import { DeleteListingButton } from "@/components/admin/DeleteListingButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const listings = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
  const serialized = listings.map(serializeListing);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500">{serialized.length} total</p>
        </div>
        <Link
          href="/admin/listings/new"
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-dark"
        >
          + Add Listing
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {serialized.length === 0 && (
          <p className="rounded-xl border border-dashed border-brand-divider bg-white p-8 text-center text-gray-500">
            No listings yet. Add your first one.
          </p>
        )}

        {serialized.map((listing) => (
          <div
            key={listing.id}
            className="flex flex-col gap-3 rounded-xl border border-brand-divider bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.images[0] || "/window.svg"}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg bg-brand-bg object-cover"
              />
              <div>
                <p className="font-semibold text-gray-900">{listing.title}</p>
                <p className="text-xs text-gray-500">
                  {listing.propertyId} · {listing.area} · ₹{listing.rent.toLocaleString("en-IN")}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${AVAILABILITY_STYLES[listing.availability]}`}
                >
                  {AVAILABILITY_LABELS[listing.availability]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Link
                href={`/admin/listings/${listing.id}/edit`}
                className="rounded-lg border border-brand-divider px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-brand-bg"
              >
                Edit
              </Link>
              <DeleteListingButton id={listing.id} propertyId={listing.propertyId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
