import { prisma } from "./prisma";

/** Active pricing tiers, ordered, for the public Pricing section. */
export async function getActivePricingTiers() {
  return prisma.pricingTier.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** All pricing tiers regardless of enabled state, for the admin panel. */
export async function getAllPricingTiers() {
  return prisma.pricingTier.findMany({
    orderBy: { sortOrder: "asc" },
  });
}
