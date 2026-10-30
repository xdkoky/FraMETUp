-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "quizCompletedAt" TIMESTAMP(3),
ADD COLUMN     "quizResult" JSONB,
ADD COLUMN     "quizSkippedAt" TIMESTAMP(3);
