-- CreateEnum
CREATE TYPE "LessonMediaKind" AS ENUM ('REFERENCE', 'EXAMPLE');

-- CreateEnum
CREATE TYPE "LessonMediaVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateTable
CREATE TABLE "LessonMedia" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "kind" "LessonMediaKind" NOT NULL,
    "visibility" "LessonMediaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "afterStorageKey" TEXT,
    "afterMimeType" TEXT,
    "beforeLabel" TEXT,
    "afterLabel" TEXT,
    "caption" TEXT NOT NULL,
    "credit" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LessonMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonMedia_lessonId_kind_idx" ON "LessonMedia"("lessonId", "kind");

-- CreateIndex
CREATE INDEX "LessonMedia_uploaderId_idx" ON "LessonMedia"("uploaderId");

-- AddForeignKey
ALTER TABLE "LessonMedia" ADD CONSTRAINT "LessonMedia_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
