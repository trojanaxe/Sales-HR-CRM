import Image from "next/image";
import Link from "next/link";
import type { ListingWithImages } from "@/lib/types";
import { AVAILABILITY_LABELS, AVAILABILITY_STYLES } from "@/lib/types";
import { CheckBadgeIcon, MapPinIcon } from "./icons";

export function ListingCard({ listing }: { listing: ListingWithImages }) {
  const coverImage = listing.images[0];

  return (
    <Link
      href={`/listing/${listing.propertyId}`}
      className="group block overflow-hidden rounded-2xl border border-brand-divider bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-bg">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No photo yet
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${AVAILABILITY_STYLES[listing.availability]}`}
        >
          {AVAILABILITY_LABELS[listing.availability]}
        </span>

        {listing.verified && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-primary-dark shadow-sm">
            <CheckBadgeIcon className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold text-gray-900">
            ₹{listing.rent.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
          <span className="rounded-full bg-brand-bg px-2.5 py-1 text-xs font-medium text-gray-600">
            {listing.listerType === "OWNER" ? "Owner" : "Broker"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
          <span className="font-medium">{listing.bhk}</span>
          <span className="text-gray-300">•</span>
          <span>{listing.furnishing}</span>
        </div>

        <p className="flex items-center gap-1 text-xs text-gray-500">
          <MapPinIcon className="h-3.5 w-3.5" />
          {listing.area.name}
        </p>

        <span className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary-dark transition group-hover:bg-brand-primary group-hover:text-white">
          View Details
        </span>
      </div>
    </Link>
  );
}
