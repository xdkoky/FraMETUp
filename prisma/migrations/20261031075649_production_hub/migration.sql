-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PRE_PRODUCTION', 'READY', 'PRODUCTION', 'WRAPPED', 'POST_PRODUCTION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ShotStatus" AS ENUM ('PLANNED', 'PREPARING', 'READY', 'SHOOTING', 'COMPLETED', 'SKIPPED', 'PICKUP');

-- CreateEnum
CREATE TYPE "CallSheetState" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "Production" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'Studio exercise',
    "location" TEXT NOT NULL DEFAULT 'Lloyd Studio',
    "shootDate" TIMESTAMP(3),
    "status" "ProductionStatus" NOT NULL DEFAULT 'PRE_PRODUCTION',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionMember" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "roles" TEXT[],
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "isActor" BOOLEAN NOT NULL DEFAULT false,
    "status" "MemberStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "dramaticObjective" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "motivations" TEXT NOT NULL DEFAULT '',
    "visualIntention" TEXT NOT NULL DEFAULT '',
    "cameraMovement" TEXT NOT NULL DEFAULT '',
    "framing" TEXT NOT NULL DEFAULT '',
    "lighting" TEXT NOT NULL DEFAULT '',
    "sound" TEXT NOT NULL DEFAULT '',
    "directorNotes" TEXT NOT NULL DEFAULT '',
    "dopNotes" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "angle" TEXT NOT NULL DEFAULT '',
    "movement" TEXT NOT NULL DEFAULT '',
    "focalLength" DOUBLE PRECISION,
    "cameraLabel" TEXT,
    "sensorLabel" TEXT,
    "aspect" TEXT,
    "lens" TEXT,
    "setupMinutes" INTEGER,
    "equipment" TEXT NOT NULL DEFAULT '',
    "intention" TEXT NOT NULL DEFAULT '',
    "dopNotes" TEXT NOT NULL DEFAULT '',
    "status" "ShotStatus" NOT NULL DEFAULT 'PLANNED',
    "prepStartedAt" TIMESTAMP(3),
    "shootStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "preferredReferenceId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShotReference" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "focalLength" DOUBLE PRECISION,
    "cameraLabel" TEXT,
    "sensorLabel" TEXT,
    "sensorWidthMm" DOUBLE PRECISION,
    "sensorHeightMm" DOUBLE PRECISION,
    "aspect" TEXT,
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "phoneFovDeg" DOUBLE PRECISION,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShotReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraProfile" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modes" JSONB NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneCalibration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "longSideFovDeg" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetVersion" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "state" "CallSheetState" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "changeSummary" TEXT NOT NULL DEFAULT '',
    "important" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSheetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetAcknowledgement" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSheetAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assigneeId" TEXT,
    "department" TEXT NOT NULL DEFAULT '',
    "sceneId" TEXT,
    "shotId" TEXT,
    "due" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentReadiness" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentReadiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TakeLog" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "take" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "continuity" TEXT NOT NULL DEFAULT '',
    "soundIssue" TEXT NOT NULL DEFAULT '',
    "cameraIssue" TEXT NOT NULL DEFAULT '',
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "photoKey" TEXT,
    "photoMime" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TakeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDocument" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sceneId" TEXT,
    "taskId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionAnnouncement" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionChange" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionComment" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrapReport" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "technicalProblems" TEXT NOT NULL DEFAULT '',
    "scheduleChanges" TEXT NOT NULL DEFAULT '',
    "wrappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wrappedById" TEXT NOT NULL,

    CONSTRAINT "WrapReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReflection" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionMember_userId_idx" ON "ProductionMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionMember_productionId_userId_key" ON "ProductionMember"("productionId", "userId");

-- CreateIndex
CREATE INDEX "Scene_productionId_idx" ON "Scene"("productionId");

-- CreateIndex
CREATE INDEX "Shot_productionId_idx" ON "Shot"("productionId");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneCalibration_userId_label_key" ON "PhoneCalibration"("userId", "label");

-- CreateIndex
CREATE INDEX "CallSheetVersion_productionId_state_idx" ON "CallSheetVersion"("productionId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CallSheetAcknowledgement_versionId_memberId_key" ON "CallSheetAcknowledgement"("versionId", "memberId");

-- CreateIndex
CREATE INDEX "ProductionTask_productionId_idx" ON "ProductionTask"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentReadiness_productionId_department_key" ON "DepartmentReadiness"("productionId", "department");

-- CreateIndex
CREATE UNIQUE INDEX "TakeLog_shotId_take_key" ON "TakeLog"("shotId", "take");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDocumentVersion_documentId_version_key" ON "ProductionDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "ProductionChange_productionId_createdAt_idx" ON "ProductionChange"("productionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionComment_targetType_targetId_idx" ON "ProductionComment"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "WrapReport_productionId_key" ON "WrapReport"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReflection_productionId_userId_key" ON "ProductionReflection"("productionId", "userId");

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMember" ADD CONSTRAINT "ProductionMember_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMember" ADD CONSTRAINT "ProductionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotReference" ADD CONSTRAINT "ShotReference_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotReference" ADD CONSTRAINT "ShotReference_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraProfile" ADD CONSTRAINT "CameraProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneCalibration" ADD CONSTRAINT "PhoneCalibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetVersion" ADD CONSTRAINT "CallSheetVersion_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetAcknowledgement" ADD CONSTRAINT "CallSheetAcknowledgement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CallSheetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetAcknowledgement" ADD CONSTRAINT "CallSheetAcknowledgement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ProductionMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "ProductionMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentReadiness" ADD CONSTRAINT "DepartmentReadiness_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeLog" ADD CONSTRAINT "TakeLog_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeLog" ADD CONSTRAINT "TakeLog_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeLog" ADD CONSTRAINT "TakeLog_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocument" ADD CONSTRAINT "ProductionDocument_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocument" ADD CONSTRAINT "ProductionDocument_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocument" ADD CONSTRAINT "ProductionDocument_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDocumentVersion" ADD CONSTRAINT "ProductionDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProductionDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionAnnouncement" ADD CONSTRAINT "ProductionAnnouncement_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionChange" ADD CONSTRAINT "ProductionChange_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComment" ADD CONSTRAINT "ProductionComment_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrapReport" ADD CONSTRAINT "WrapReport_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReflection" ADD CONSTRAINT "ProductionReflection_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;
