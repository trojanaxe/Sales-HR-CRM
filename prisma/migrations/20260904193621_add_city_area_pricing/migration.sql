-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Area_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "price" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "areaId" TEXT,
    "rent" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "propertyType" TEXT NOT NULL,
    "bhk" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "totalFloors" TEXT NOT NULL,
    "facing" TEXT NOT NULL,
    "balcony" TEXT NOT NULL,
    "furnishing" TEXT NOT NULL,
    "parking" TEXT NOT NULL,
    "ageOfBuilding" TEXT NOT NULL,
    "maintenance" TEXT NOT NULL,
    "waterSupply" TEXT NOT NULL,
    "powerBackup" TEXT NOT NULL,
    "lift" TEXT NOT NULL,
    "gatedCommunity" TEXT NOT NULL,
    "preferredTenant" TEXT NOT NULL,
    "previousTenant" TEXT NOT NULL,
    "petFriendly" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "listerType" TEXT NOT NULL DEFAULT 'OWNER',
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT NOT NULL DEFAULT '[]',
    "mapEmbedUrl" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    CONSTRAINT "Listing_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("about", "ageOfBuilding", "area", "availability", "balcony", "bhk", "createdAt", "deposit", "facing", "floor", "furnishing", "gatedCommunity", "id", "images", "latitude", "lift", "listerType", "longitude", "maintenance", "mapEmbedUrl", "parking", "petFriendly", "powerBackup", "preferredTenant", "previousTenant", "propertyId", "propertyType", "rent", "title", "totalFloors", "updatedAt", "verified", "waterSupply") SELECT "about", "ageOfBuilding", "area", "availability", "balcony", "bhk", "createdAt", "deposit", "facing", "floor", "furnishing", "gatedCommunity", "id", "images", "latitude", "lift", "listerType", "longitude", "maintenance", "mapEmbedUrl", "parking", "petFriendly", "powerBackup", "preferredTenant", "previousTenant", "propertyId", "propertyType", "rent", "title", "totalFloors", "updatedAt", "verified", "waterSupply" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE UNIQUE INDEX "Listing_propertyId_key" ON "Listing"("propertyId");
CREATE INDEX "Listing_availability_idx" ON "Listing"("availability");
CREATE INDEX "Listing_areaId_idx" ON "Listing"("areaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Area_cityId_name_key" ON "Area"("cityId", "name");

-- CreateIndex
CREATE INDEX "PricingTier_sortOrder_idx" ON "PricingTier"("sortOrder");
