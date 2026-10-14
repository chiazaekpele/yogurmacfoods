-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/products',
    "position" TEXT,
    "fit" TEXT NOT NULL DEFAULT 'cover',
    "background" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaImage" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroSlide_isActive_sortOrder_idx" ON "HeroSlide"("isActive", "sortOrder");


-- The three slides the homepage carousel had before it became editable.
INSERT INTO "HeroSlide" ("id", "imageUrl", "alt", "href", "position", "fit", "background", "sortOrder", "updatedAt") VALUES
  ('hero_parfait', '/images/products/parfait-classic.jpg', 'Yogurmac Greek yogurt parfait with apple, coconut and granola', '/products', 'center 12%', 'cover', NULL, 0, CURRENT_TIMESTAMP),
  ('hero_outreach', '/images/hero/ythirst-outreach.jpg', 'Children at a Ythirst outreach making heart shapes with their hands', '/impact#ythirst', 'center 42%', 'cover', NULL, 1, CURRENT_TIMESTAMP),
  ('hero_900', '/images/hero/ythirst-900-children.jpg', '900 children and counting, supported through the Ythirst Project', '/impact#ythirst', NULL, 'contain', '#FDDB44', 2, CURRENT_TIMESTAMP);
