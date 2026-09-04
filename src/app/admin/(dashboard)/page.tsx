import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  serializeListing,
  AVAILABILITY_LABELS,
  AVAILABILITY_STYLES,
  LISTING_WITH_AREA_INCLUDE,
} from "@/lib/types";
import { DeleteListingButton } from "@/components/admin/DeleteListingButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    include: LISTING_WITH_AREA_INCLUDE,
  });
  const serialized = listings.map(serializeListing);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-whisper text-heading-sm text-ink">Listings</h1>
          <p className="text-body-sm text-ink-muted">{serialized.length} total</p>
        </div>
        <Link
          href="/admin/listings/new"
          className="font-whisper rounded-full bg-brand-primary px-5 py-2.5 text-body-sm text-white shadow-cta transition hover:bg-brand-primary-dark"
        >
          + Add Listing
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {serialized.length === 0 && (
          <p className="rounded-3xl border border-dashed border-brand-divider bg-surface p-8 text-center text-body-sm text-ink-muted">
            No listings yet. Add your first one.
          </p>
        )}

        {serialized.map((listing) => (
          <div
            key={listing.id}
            className="flex flex-col gap-3 rounded-3xl border border-brand-divider bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.images[0] || "/window.svg"}
                alt=""
                className="h-14 w-14 shrink-0 rounded-2xl bg-brand-bg object-cover"
              />
              <div>
                <p className="font-whisper text-body text-ink">{listing.title}</p>
                <p className="text-caption text-ink-muted">
                  {listing.propertyId} · {listing.area.name} · ₹{listing.rent.toLocaleString("en-IN")}
                </p>
                <span
                  className={`text-caption font-whisper mt-1 inline-block rounded-full px-3 py-1 ${AVAILABILITY_STYLES[listing.availability]}`}
                >
                  {AVAILABILITY_LABELS[listing.availability]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Link
                href={`/admin/listings/${listing.id}/edit`}
                className="text-caption font-whisper rounded-full border border-brand-divider px-4 py-1.5 text-ink transition hover:bg-brand-bg"
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
