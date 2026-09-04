import { prisma } from "./prisma";

export type CityWithAreas = {
  id: string;
  name: string;
  enabled: boolean;
  areas: { id: string; name: string; enabled: boolean }[];
};

/** Cities + areas, enabled-only, for the public site (dropdowns, service-area label). */
export async function getEnabledCitiesWithAreas(): Promise<CityWithAreas[]> {
  const cities = await prisma.city.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    include: {
      areas: {
        where: { enabled: true },
        orderBy: { name: "asc" },
      },
    },
  });
  return cities.filter((city) => city.areas.length > 0);
}

/** All cities + areas regardless of enabled state, for the admin panel. */
export async function getAllCitiesWithAreas(): Promise<CityWithAreas[]> {
  return prisma.city.findMany({
    orderBy: { name: "asc" },
    include: {
      areas: { orderBy: { name: "asc" } },
    },
  });
}

/** "Thanisandra · HegdeNagar · Kothanur · Nagawara" style label from enabled areas only. */
export async function getServiceAreaNames(): Promise<string[]> {
  const cities = await getEnabledCitiesWithAreas();
  return cities.flatMap((city) => city.areas.map((area) => area.name));
}
