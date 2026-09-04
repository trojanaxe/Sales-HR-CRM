import type { ListingWithImages } from "@/lib/types";
import { ListingCard } from "./ListingCard";

export function ListingsGrid({ listings }: { listings: ListingWithImages[] }) {
  return (
    <section id="listings" className="scroll-mt-16 bg-brand-bg">
      <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
        <h2 className="font-whisper text-heading text-ink">Available Flats</h2>
        <p className="mt-2 text-body-sm text-ink-muted">
          {listings.length} verified {listings.length === 1 ? "listing" : "listings"}
        </p>

        {listings.length === 0 ? (
          <p className="mt-10 rounded-3xl border border-dashed border-brand-divider bg-surface p-8 text-center text-body-sm text-ink-muted">
            New listings are being added. Check back soon, or message us on WhatsApp.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
