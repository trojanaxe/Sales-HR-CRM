import type { Listing as PrismaListing, Area, City } from "@prisma/client";

export const LISTING_WITH_AREA_INCLUDE = {
  area: { include: { city: true } },
} as const;

type ListingRecord = PrismaListing & { area: Area & { city: City } };

export type ListingWithImages = Omit<
  ListingRecord,
  "images" | "createdAt" | "updatedAt" | "area"
> & {
  images: string[];
  createdAt: string;
  updatedAt: string;
  area: {
    id: string;
    name: string;
    enabled: boolean;
    city: { id: string; name: string; enabled: boolean };
  };
};

export function serializeListing(listing: ListingRecord): ListingWithImages {
  let images: string[] = [];
  try {
    images = JSON.parse(listing.images);
  } catch {
    images = [];
  }

  const { area, createdAt, updatedAt, ...rest } = listing;

  return {
    ...rest,
    images,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    area: {
      id: area.id,
      name: area.name,
      enabled: area.enabled,
      city: { id: area.city.id, name: area.city.name, enabled: area.city.enabled },
    },
  };
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  UNDER_DISCUSSION: "Under Discussion",
  RENTED: "Rented",
};

export const AVAILABILITY_STYLES: Record<string, string> = {
  AVAILABLE: "bg-success text-white",
  UNDER_DISCUSSION: "bg-amber-100 text-amber-800",
  RENTED: "bg-ink-muted/20 text-ink-muted",
};
