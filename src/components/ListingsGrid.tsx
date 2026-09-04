import type { ListingWithImages } from "@/lib/types";
import { ListingCard } from "./ListingCard";

export function ListingsGrid({ listings }: { listings: ListingWithImages[] }) {
  return (
    <section id="listings" className="scroll-mt-16 bg-brand-bg">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-heading text-2xl font-bold text-gray-900 sm:text-3xl">Available Flats</h2>
        <p className="mt-1 text-sm text-gray-500">
          {listings.length} verified {listings.length === 1 ? "listing" : "listings"}
        </p>

        {listings.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-brand-divider bg-white p-8 text-center text-gray-500">
            New listings are being added. Check back soon, or message us on WhatsApp.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
