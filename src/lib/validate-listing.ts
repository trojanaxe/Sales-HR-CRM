const REQUIRED_STRING_FIELDS = [
  "propertyId",
  "title",
  "areaId",
  "propertyType",
  "bhk",
  "floor",
  "totalFloors",
  "facing",
  "balcony",
  "furnishing",
  "parking",
  "ageOfBuilding",
  "maintenance",
  "waterSupply",
  "powerBackup",
  "lift",
  "gatedCommunity",
  "preferredTenant",
  "previousTenant",
  "petFriendly",
  "about",
] as const;

const AVAILABILITY_VALUES = ["AVAILABLE", "UNDER_DISCUSSION", "RENTED"];
const LISTER_TYPE_VALUES = ["OWNER", "BROKER"];

export type ListingInput = {
  propertyId: string;
  title: string;
  areaId: string;
  rent: number;
  deposit: number;
  availability: "AVAILABLE" | "UNDER_DISCUSSION" | "RENTED";
  propertyType: string;
  bhk: string;
  floor: string;
  totalFloors: string;
  facing: string;
  balcony: string;
  furnishing: string;
  parking: string;
  ageOfBuilding: string;
  maintenance: string;
  waterSupply: string;
  powerBackup: string;
  lift: string;
  gatedCommunity: string;
  preferredTenant: string;
  previousTenant: string;
  petFriendly: string;
  about: string;
  listerType: "OWNER" | "BROKER";
  verified: boolean;
  images: string[];
  mapEmbedUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function validateListingInput(body: unknown): { data: ListingInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof b[field] !== "string" || b[field] === "") {
      return { error: `"${field}" is required.` };
    }
  }

  const rent = Number(b.rent);
  const deposit = Number(b.deposit);
  if (!Number.isFinite(rent) || rent < 0) return { error: "Rent must be a valid number." };
  if (!Number.isFinite(deposit) || deposit < 0)
    return { error: "Deposit must be a valid number." };

  const availability = b.availability;
  if (typeof availability !== "string" || !AVAILABILITY_VALUES.includes(availability)) {
    return { error: "Invalid availability status." };
  }

  const listerType = b.listerType;
  if (typeof listerType !== "string" || !LISTER_TYPE_VALUES.includes(listerType)) {
    return { error: "Invalid lister type." };
  }

  const images = b.images;
  if (!Array.isArray(images) || !images.every((i) => typeof i === "string")) {
    return { error: "Images must be an array of URLs." };
  }

  const mapEmbedUrl =
    typeof b.mapEmbedUrl === "string" && b.mapEmbedUrl.trim() !== "" ? b.mapEmbedUrl.trim() : null;
  const latitude =
    b.latitude === null || b.latitude === undefined || b.latitude === ""
      ? null
      : Number(b.latitude);
  const longitude =
    b.longitude === null || b.longitude === undefined || b.longitude === ""
      ? null
      : Number(b.longitude);

  if (latitude !== null && !Number.isFinite(latitude)) return { error: "Invalid latitude." };
  if (longitude !== null && !Number.isFinite(longitude)) return { error: "Invalid longitude." };

  return {
    data: {
      propertyId: (b.propertyId as string).trim(),
      title: (b.title as string).trim(),
      areaId: (b.areaId as string).trim(),
      rent: Math.round(rent),
      deposit: Math.round(deposit),
      availability: availability as ListingInput["availability"],
      propertyType: (b.propertyType as string).trim(),
      bhk: (b.bhk as string).trim(),
      floor: (b.floor as string).trim(),
      totalFloors: (b.totalFloors as string).trim(),
      facing: (b.facing as string).trim(),
      balcony: (b.balcony as string).trim(),
      furnishing: (b.furnishing as string).trim(),
      parking: (b.parking as string).trim(),
      ageOfBuilding: (b.ageOfBuilding as string).trim(),
      maintenance: (b.maintenance as string).trim(),
      waterSupply: (b.waterSupply as string).trim(),
      powerBackup: (b.powerBackup as string).trim(),
      lift: (b.lift as string).trim(),
      gatedCommunity: (b.gatedCommunity as string).trim(),
      preferredTenant: (b.preferredTenant as string).trim(),
      previousTenant: (b.previousTenant as string).trim(),
      petFriendly: (b.petFriendly as string).trim(),
      about: (b.about as string).trim(),
      listerType: listerType as ListingInput["listerType"],
      verified: Boolean(b.verified),
      images,
      mapEmbedUrl,
      latitude,
      longitude,
    },
  };
}
