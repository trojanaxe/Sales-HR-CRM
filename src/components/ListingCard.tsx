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
      className="group block overflow-hidden rounded-3xl border border-brand-divider bg-surface transition hover:border-ink-muted/40"
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
          <div className="flex h-full w-full items-center justify-center text-body-sm text-ink-muted">
            No photo yet
          </div>
        )}

        <span
          className={`text-caption font-whisper absolute left-3 top-3 rounded-full px-3 py-1 ${AVAILABILITY_STYLES[listing.availability]}`}
        >
          {AVAILABILITY_LABELS[listing.availability]}
        </span>

        {listing.verified && (
          <span className="text-caption font-whisper absolute right-3 top-3 flex items-center gap-1 rounded-full bg-surface/95 px-3 py-1 text-brand-primary-dark">
            <CheckBadgeIcon className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-whisper text-subheading text-ink">
            ₹{listing.rent.toLocaleString("en-IN")}
            <span className="text-body-sm font-normal text-ink-muted">/mo</span>
          </p>
          <span className="rounded-full bg-brand-bg px-3 py-1 text-caption font-whisper text-ink-muted">
            {listing.listerType === "OWNER" ? "Owner" : "Broker"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink">
          <span className="font-whisper">{listing.bhk}</span>
          <span className="text-ink-muted/50">•</span>
          <span>{listing.furnishing}</span>
        </div>

        <p className="flex items-center gap-1 text-caption text-ink-muted">
          <MapPinIcon className="h-3.5 w-3.5" />
          {listing.area.name}
        </p>

        <span className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary/10 px-4 py-2.5 text-body-sm font-whisper text-brand-primary-dark transition group-hover:bg-brand-primary group-hover:text-white">
          View Details
        </span>
      </div>
    </Link>
  );
}
