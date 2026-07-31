import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/types";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { ListingsGrid } from "@/components/ListingsGrid";

export const dynamic = "force-dynamic";

const AVAILABILITY_ORDER: Record<string, number> = {
  AVAILABLE: 0,
  UNDER_DISCUSSION: 1,
  RENTED: 2,
};

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
  });

  const sorted = listings
    .map(serializeListing)
    .sort((a, b) => AVAILABILITY_ORDER[a.availability] - AVAILABILITY_ORDER[b.availability]);

  return (
    <>
      <Hero />
      <HowItWorks />
      <Pricing />
      <ListingsGrid listings={sorted} />
    </>
  );
}
