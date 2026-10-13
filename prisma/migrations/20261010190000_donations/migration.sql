-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "donorName" TEXT,
    "donorEmail" TEXT NOT NULL,
    "children" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2),
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_reference_key" ON "Donation"("reference");

-- CreateIndex
CREATE INDEX "Donation_status_paidAt_idx" ON "Donation"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

