-- Categories become a table the owner manages (14 Oct 2026). The four fixed
-- categories carry over; Wellness Boxes is the box-type one.

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
UPDATE "Product" SET "categoryId" = CASE "category"
  WHEN 'YOGURT' THEN 'cat_yogurt'
  WHEN 'GRANOLA' THEN 'cat_granola'
  WHEN 'ENERGY_BAR' THEN 'cat_energy_bars'
  WHEN 'WELLNESS_BOX' THEN 'cat_wellness_boxes'
END;
ALTER TABLE "Product" DROP COLUMN "category";
-- The enum must go before the table of the same name is created.
DROP TYPE "Category";

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isBox" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

INSERT INTO "Category" ("id", "name", "slug", "isBox", "sortOrder", "updatedAt") VALUES
  ('cat_yogurt', 'Greek Yogurt', 'greek-yogurt', false, 1, CURRENT_TIMESTAMP),
  ('cat_granola', 'Granola', 'granola', false, 2, CURRENT_TIMESTAMP),
  ('cat_energy_bars', 'Energy Bars', 'energy-bars', false, 3, CURRENT_TIMESTAMP),
  ('cat_wellness_boxes', 'Wellness Boxes', 'wellness-boxes', true, 4, CURRENT_TIMESTAMP);

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD COLUMN "contents" TEXT;
