-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
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
INSERT INTO "new_Listing" ("about", "ageOfBuilding", "areaId", "availability", "balcony", "bhk", "createdAt", "deposit", "facing", "floor", "furnishing", "gatedCommunity", "id", "images", "latitude", "lift", "listerType", "longitude", "maintenance", "mapEmbedUrl", "parking", "petFriendly", "powerBackup", "preferredTenant", "previousTenant", "propertyId", "propertyType", "rent", "title", "totalFloors", "updatedAt", "verified", "waterSupply") SELECT "about", "ageOfBuilding", "areaId", "availability", "balcony", "bhk", "createdAt", "deposit", "facing", "floor", "furnishing", "gatedCommunity", "id", "images", "latitude", "lift", "listerType", "longitude", "maintenance", "mapEmbedUrl", "parking", "petFriendly", "powerBackup", "preferredTenant", "previousTenant", "propertyId", "propertyType", "rent", "title", "totalFloors", "updatedAt", "verified", "waterSupply" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE UNIQUE INDEX "Listing_propertyId_key" ON "Listing"("propertyId");
CREATE INDEX "Listing_availability_idx" ON "Listing"("availability");
CREATE INDEX "Listing_areaId_idx" ON "Listing"("areaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

