import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  serializeListing,
  AVAILABILITY_LABELS,
  AVAILABILITY_STYLES,
  LISTING_WITH_AREA_INCLUDE,
} from "@/lib/types";
import { Gallery } from "@/components/Gallery";
import { StickyBottomCTA } from "@/components/StickyBottomCTA";
import { DetailSection, DetailGrid } from "@/components/DetailSection";
import { MapEmbed } from "@/components/MapEmbed";
import { CheckBadgeIcon, MapPinIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getListing(propertyId: string) {
  const listing = await prisma.listing.findUnique({
    where: { propertyId, area: { enabled: true, city: { enabled: true } } },
    include: LISTING_WITH_AREA_INCLUDE,
  });
  if (!listing) return null;
  return serializeListing(listing);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}): Promise<Metadata> {
  const { propertyId } = await params;
  const listing = await getListing(propertyId);
  if (!listing) return { title: "Listing not found — Homespy" };
  return {
    title: `${listing.title} — ${listing.area.name} | Homespy`,
    description: listing.about,
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const listing = await getListing(propertyId);

  if (!listing) notFound();

  return (
    <>
      <div className="pb-24">
        <Gallery images={listing.images} alt={listing.title} />

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-caption font-whisper rounded-full px-3 py-1 ${AVAILABILITY_STYLES[listing.availability]}`}
              >
                {AVAILABILITY_LABELS[listing.availability]}
              </span>
              {listing.verified && (
                <span className="text-caption font-whisper flex items-center gap-1 rounded-full bg-brand-primary/10 px-3 py-1 text-brand-primary-dark">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
              <span className="text-caption font-whisper rounded-full bg-brand-bg px-3 py-1 text-ink-muted">
                {listing.listerType === "OWNER" ? "Owner" : "Broker"}
              </span>
            </div>

            <h1 className="font-whisper mt-3 text-heading-sm text-ink">{listing.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-body-sm text-ink-muted">
              <MapPinIcon className="h-4 w-4" />
              {listing.area.name}, {listing.area.city.name}
            </p>
            <p className="mt-1 text-caption text-ink-muted/70">
              Property ID: {listing.propertyId}
            </p>
          </div>

          {/* Price Summary */}
          <section className="grid grid-cols-3 gap-3 rounded-3xl border border-brand-divider bg-brand-bg p-6">
            <div>
              <p className="text-caption text-ink-muted">Rent</p>
              <p className="font-whisper mt-1 text-body text-ink">
                ₹{listing.rent.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Deposit</p>
              <p className="font-whisper mt-1 text-body text-ink">
                ₹{listing.deposit.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Availability</p>
              <p className="font-whisper mt-1 text-body text-ink">
                {AVAILABILITY_LABELS[listing.availability]}
              </p>
            </div>
          </section>

          <DetailSection title="Property Overview">
            <DetailGrid
              rows={[
                ["Property Type", listing.propertyType],
                ["BHK", listing.bhk],
                ["Floor / Total Floors", `${listing.floor} of ${listing.totalFloors}`],
                ["Facing", listing.facing],
                ["Balcony", listing.balcony],
                ["Furnishing", listing.furnishing],
                ["Parking", listing.parking],
                ["Age of Building", listing.ageOfBuilding],
              ]}
            />
          </DetailSection>

          <DetailSection title="Utilities & Charges">
            <DetailGrid
              rows={[
                ["Maintenance", listing.maintenance],
                ["Water Supply", listing.waterSupply],
                ["Power Backup", listing.powerBackup],
                ["Lift", listing.lift],
                ["Gated Community", listing.gatedCommunity],
              ]}
            />
          </DetailSection>

          <DetailSection title="Tenant Info">
            <DetailGrid
              rows={[
                ["Preferred Tenant", listing.preferredTenant],
                ["Previous Tenant", listing.previousTenant],
                ["Pet Friendly", listing.petFriendly],
              ]}
            />
          </DetailSection>

          <DetailSection title="About the Property">
            <p className="text-body-sm leading-relaxed text-ink">{listing.about}</p>
          </DetailSection>

          <DetailSection title="Location">
            <MapEmbed mapEmbedUrl={listing.mapEmbedUrl} area={listing.area.name} />
          </DetailSection>
        </div>
      </div>

      <StickyBottomCTA propertyId={listing.propertyId} />
    </>
  );
}
