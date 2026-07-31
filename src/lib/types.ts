import type { Listing as PrismaListing } from "@prisma/client";

export type ListingWithImages = Omit<PrismaListing, "images" | "createdAt" | "updatedAt"> & {
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export function serializeListing(listing: PrismaListing): ListingWithImages {
  let images: string[] = [];
  try {
    images = JSON.parse(listing.images);
  } catch {
    images = [];
  }
  return {
    ...listing,
    images,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  UNDER_DISCUSSION: "Under Discussion",
  RENTED: "Rented",
};

export const AVAILABILITY_STYLES: Record<string, string> = {
  AVAILABLE: "bg-brand-primary/10 text-brand-primary-dark",
  UNDER_DISCUSSION: "bg-amber-100 text-amber-700",
  RENTED: "bg-gray-200 text-gray-600",
};
