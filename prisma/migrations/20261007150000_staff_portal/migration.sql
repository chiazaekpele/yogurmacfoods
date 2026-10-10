-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ReviewCadence" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SetbackCategory" AS ENUM ('INGREDIENT_SHORTAGE', 'EQUIPMENT_ISSUE', 'PACKAGING_ISSUE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "inviteTokenHash" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "cadence" "ReviewCadence" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewQuestion" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "isLongAnswer" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubmission" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "isMissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignToAll" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "blockerNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "activityText" TEXT NOT NULL,
    "generalSetbacks" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "editableUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetbackReport" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "category" "SetbackCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetbackReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderClaim" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedReadyAt" TIMESTAMP(3),

    CONSTRAINT "OrderClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteTokenHash_key" ON "User"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "ReviewQuestion_cycleId_order_idx" ON "ReviewQuestion"("cycleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubmission_staffId_cycleId_periodStart_key" ON "ReviewSubmission"("staffId", "cycleId", "periodStart");

-- CreateIndex
CREATE INDEX "TaskAssignment_staffId_status_idx" ON "TaskAssignment"("staffId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_taskId_staffId_key" ON "TaskAssignment"("taskId", "staffId");

-- CreateIndex
CREATE INDEX "DailyLog_logDate_idx" ON "DailyLog"("logDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_staffId_logDate_key" ON "DailyLog"("staffId", "logDate");

-- CreateIndex
CREATE INDEX "SetbackReport_orderId_idx" ON "SetbackReport"("orderId");

-- CreateIndex
CREATE INDEX "SetbackReport_staffId_idx" ON "SetbackReport"("staffId");

-- CreateIndex
CREATE INDEX "Announcement_scheduledFor_idx" ON "Announcement"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_staffId_key" ON "AnnouncementRead"("announcementId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderClaim_orderId_key" ON "OrderClaim"("orderId");

-- CreateIndex
CREATE INDEX "OrderClaim_staffId_idx" ON "OrderClaim"("staffId");

-- AddForeignKey
ALTER TABLE "ReviewQuestion" ADD CONSTRAINT "ReviewQuestion_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ReviewSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ReviewQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetbackReport" ADD CONSTRAINT "SetbackReport_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetbackReport" ADD CONSTRAINT "SetbackReport_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderClaim" ADD CONSTRAINT "OrderClaim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderClaim" ADD CONSTRAINT "OrderClaim_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- One order in production per staff member at a time (TRD §5.5). Prisma has no
-- partial unique index, so it lives here. Claim code maps its violation (P2002)
-- to "Mark your current order as Ready before claiming another."
CREATE UNIQUE INDEX "one_active_claim_per_staff" ON "OrderClaim" ("staffId") WHERE "markedReadyAt" IS NULL;
