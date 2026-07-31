import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleImages = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=80",
];

const listings = [
  {
    propertyId: "BPC-Thanisandra-07",
    title: "2BHK in Thanisandra",
    area: "Thanisandra",
    rent: 25000,
    deposit: 100000,
    availability: "AVAILABLE" as const,
    propertyType: "Apartment",
    bhk: "2 BHK",
    floor: "3rd",
    totalFloors: "5",
    facing: "East",
    balcony: "2",
    furnishing: "Semi-furnished",
    parking: "1 Covered (Car)",
    ageOfBuilding: "3 years",
    maintenance: "₹1,500/month",
    waterSupply: "Cauvery + Borewell",
    powerBackup: "Common areas only",
    lift: "Yes",
    gatedCommunity: "Yes",
    preferredTenant: "Family / Working professionals",
    previousTenant: "Family, stayed 2 years",
    petFriendly: "Yes, small pets allowed",
    about:
      "Bright and airy 2BHK on a quiet street in Thanisandra, close to schools and grocery stores. Recently repainted with a modular kitchen. Ideal for a small family or a couple of working professionals.",
    listerType: "OWNER" as const,
    verified: true,
    images: sampleImages.slice(0, 5),
    mapEmbedUrl:
      "https://www.google.com/maps?q=Thanisandra,Bangalore&output=embed",
  },
  {
    propertyId: "BPC-HegdeNagar-12",
    title: "3BHK in Hegde Nagar",
    area: "HegdeNagar",
    rent: 42000,
    deposit: 200000,
    availability: "AVAILABLE" as const,
    propertyType: "Apartment",
    bhk: "3 BHK",
    floor: "7th",
    totalFloors: "14",
    facing: "North-East",
    balcony: "3",
    furnishing: "Fully furnished",
    parking: "2 Covered (Car + Bike)",
    ageOfBuilding: "5 years",
    maintenance: "₹3,200/month",
    waterSupply: "Cauvery + Borewell + STP",
    powerBackup: "Full home backup",
    lift: "Yes, 3 lifts",
    gatedCommunity: "Yes, premium gated community",
    preferredTenant: "Family",
    previousTenant: "IT professional family, stayed 3 years",
    petFriendly: "Case by case",
    about:
      "Spacious 3BHK in a premium gated community near Manyata Tech Park. Comes with modular kitchen, wardrobes in all rooms, and clubhouse access with pool and gym.",
    listerType: "OWNER" as const,
    verified: true,
    images: sampleImages.slice(1, 6),
    mapEmbedUrl:
      "https://www.google.com/maps?q=Hegde+Nagar,Bangalore&output=embed",
  },
  {
    propertyId: "BPC-Kothanur-03",
    title: "1BHK in Kothanur",
    area: "Kothanur",
    rent: 15500,
    deposit: 60000,
    availability: "UNDER_DISCUSSION" as const,
    propertyType: "Independent Building",
    bhk: "1 BHK",
    floor: "2nd",
    totalFloors: "3",
    facing: "West",
    balcony: "1",
    furnishing: "Unfurnished",
    parking: "1 Open (Bike only)",
    ageOfBuilding: "8 years",
    maintenance: "Included in rent",
    waterSupply: "Borewell",
    powerBackup: "No",
    lift: "No",
    gatedCommunity: "No",
    preferredTenant: "Bachelors / Working professionals",
    previousTenant: "Bachelor, stayed 1 year",
    petFriendly: "No",
    about:
      "Compact and affordable 1BHK, perfect for a single working professional. Quiet locality with easy access to bus stops and local markets. Owner lives on the premises.",
    listerType: "OWNER" as const,
    verified: true,
    images: sampleImages.slice(2, 6),
    mapEmbedUrl:
      "https://www.google.com/maps?q=Kothanur,Bangalore&output=embed",
  },
  {
    propertyId: "BPC-Nagawara-21",
    title: "2BHK in Nagawara",
    area: "Nagawara",
    rent: 22000,
    deposit: 90000,
    availability: "AVAILABLE" as const,
    propertyType: "Apartment",
    bhk: "2 BHK",
    floor: "5th",
    totalFloors: "8",
    facing: "South",
    balcony: "1",
    furnishing: "Semi-furnished",
    parking: "1 Covered (Car)",
    ageOfBuilding: "6 years",
    maintenance: "₹2,000/month",
    waterSupply: "Cauvery + Borewell",
    powerBackup: "Common areas only",
    lift: "Yes",
    gatedCommunity: "Yes",
    preferredTenant: "Family / Working professionals",
    previousTenant: "Couple, stayed 2 years",
    petFriendly: "Yes",
    about:
      "Well-maintained 2BHK close to Nagawara metro station and Manyata Tech Park. Comes with wardrobes and geysers in both bathrooms. Vegetarian and non-vegetarian both welcome.",
    listerType: "BROKER" as const,
    verified: true,
    images: sampleImages.slice(0, 4),
    mapEmbedUrl:
      "https://www.google.com/maps?q=Nagawara,Bangalore&output=embed",
  },
];

async function main() {
  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { propertyId: listing.propertyId },
      update: {
        ...listing,
        images: JSON.stringify(listing.images),
      },
      create: {
        ...listing,
        images: JSON.stringify(listing.images),
      },
    });
  }
  console.log(`Seeded ${listings.length} listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
