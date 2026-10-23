-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('STANDARD', 'TEAM', 'GALLERY');

-- AlterTable
ALTER TABLE "InfoPage" ADD COLUMN     "kind" "PageKind" NOT NULL DEFAULT 'STANDARD';

