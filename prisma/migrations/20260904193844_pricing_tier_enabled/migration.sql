-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PricingTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "price" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PricingTier" ("createdAt", "description", "id", "label", "price", "sortOrder", "updatedAt") SELECT "createdAt", "description", "id", "label", "price", "sortOrder", "updatedAt" FROM "PricingTier";
DROP TABLE "PricingTier";
ALTER TABLE "new_PricingTier" RENAME TO "PricingTier";
CREATE INDEX "PricingTier_sortOrder_idx" ON "PricingTier"("sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
