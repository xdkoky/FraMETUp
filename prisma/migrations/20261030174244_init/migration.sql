-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'COLLABORATORS', 'COHORT');

-- CreateEnum
CREATE TYPE "DependencyKind" AS ENUM ('PREREQUISITE', 'RELATED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('SHORT_FILM', 'DIALOGUE_SCENE', 'SILENT_EXERCISE', 'DOCUMENTARY', 'MUSIC_VIDEO', 'COMMERCIAL', 'EXPERIMENTAL', 'FILM_ANALYSIS', 'DIRECTING_WORKSHOP', 'INDEPENDENT_PRACTICE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PRODUCTION', 'POST_PRODUCTION', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('SCRIPT', 'STORYBOARD', 'SHOT_LIST', 'DIRECTORS_NOTES', 'VIDEO_LINK', 'DOCUMENT_LINK', 'FILE', 'NOTE');

-- CreateEnum
CREATE TYPE "Relevance" AS ENUM ('PRIMARY', 'SECONDARY', 'INCIDENTAL');

-- CreateEnum
CREATE TYPE "Independence" AS ENUM ('WITH_GUIDANCE', 'WITH_SUPPORT', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Observation" AS ENUM ('NOT_OBSERVED', 'INSUFFICIENT_EVIDENCE', 'OBSERVED_WITH_DIFFICULTY', 'DEMONSTRATED_WITH_SUPPORT', 'DEMONSTRATED_INDEPENDENTLY', 'DEMONSTRATED_CONSISTENTLY');

-- CreateEnum
CREATE TYPE "Familiarity" AS ENUM ('BRIEF', 'WORKED_ALONGSIDE', 'CLOSE_COLLABORATOR');

-- CreateEnum
CREATE TYPE "AIAssessmentKind" AS ENUM ('REFLECTION_ANALYSIS', 'CHALLENGE_GENERATION');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ChallengeSource" AS ENUM ('CURATED', 'AI_SUGGESTED', 'USER');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACCEPTED', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "cohortId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "academicYear" INTEGER,
    "enrollmentYear" INTEGER,
    "interests" TEXT[],
    "experience" TEXT,
    "bio" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "userId" TEXT NOT NULL,
    "profileVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "defaultProjectVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "shareDnaWithCohort" BOOLEAN NOT NULL DEFAULT false,
    "aiConsent" BOOLEAN NOT NULL DEFAULT false,
    "aiConsentAt" TIMESTAMP(3),
    "allowReviewRequests" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL DEFAULT 'METU',
    "startYear" INTEGER NOT NULL,
    "programme" TEXT NOT NULL DEFAULT 'Film Directing BA',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortMembership" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTaxonomyVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTaxonomyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outcomes" TEXT[],
    "criteria" TEXT[],
    "evidenceTypes" TEXT[],
    "exercises" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRubric" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "levels" TEXT[],
    "taxonomyVersionId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SkillRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillDependency" (
    "id" TEXT NOT NULL,
    "fromSkillId" TEXT NOT NULL,
    "toSkillId" TEXT NOT NULL,
    "kind" "DependencyKind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "SkillDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "description" TEXT NOT NULL,
    "logline" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "course" TEXT,
    "semester" INTEGER,
    "studentRole" TEXT NOT NULL DEFAULT 'Director',
    "objectives" TEXT[],
    "challenges" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageKey" TEXT,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillEvidenceLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "relevance" "Relevance" NOT NULL DEFAULT 'SECONDARY',
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "independence" "Independence" NOT NULL DEFAULT 'INDEPENDENT',
    "demonstratedLevel" INTEGER,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "reflection" TEXT,
    "exampleProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReviewRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "projectId" TEXT,
    "reviewerRelation" TEXT NOT NULL,
    "message" TEXT,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "PeerReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReviewRequestSkill" (
    "requestId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "PeerReviewRequestSkill_pkey" PRIMARY KEY ("requestId","skillId")
);

-- CreateTable
CREATE TABLE "PeerReview" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "projectId" TEXT,
    "familiarity" "Familiarity" NOT NULL DEFAULT 'WORKED_ALONGSIDE',
    "overallComment" TEXT,
    "anonymousToSubject" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReviewItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "observation" "Observation" NOT NULL,
    "comment" TEXT,
    "example" TEXT,

    CONSTRAINT "PeerReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorAssessment" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AIAssessmentKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "inputType" TEXT NOT NULL,
    "inputId" TEXT NOT NULL,
    "inputChars" INTEGER NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISkillSuggestion" (
    "id" TEXT NOT NULL,
    "aiAssessmentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidenceQuote" TEXT,
    "suggestedLevel" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AISkillSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "state" TEXT NOT NULL,
    "breakdown" JSONB NOT NULL,
    "explanation" TEXT[],
    "algorithmVersion" TEXT NOT NULL,
    "taxonomyVersion" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "baseXp" INTEGER NOT NULL,
    "awardedXp" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "resources" TEXT[],
    "instructions" TEXT[],
    "completionCriteria" TEXT[],
    "reflectionQuestions" TEXT[],
    "suggestedEvidence" TEXT[],
    "source" "ChallengeSource" NOT NULL DEFAULT 'CURATED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeSkill" (
    "challengeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ChallengeSkill_pkey" PRIMARY KEY ("challengeId","skillId")
);

-- CreateTable
CREATE TABLE "ChallengeCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL,
    "personalNotes" TEXT,
    "projectId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetSemester" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achievedAt" TIMESTAMP(3),

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoalSkill" (
    "goalId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "LearningGoalSkill_pkey" PRIMARY KEY ("goalId","skillId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_cohortId_key" ON "UserRole"("userId", "roleId", "cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortMembership_cohortId_userId_key" ON "CohortMembership"("cohortId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTaxonomyVersion_version_key" ON "SkillTaxonomyVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_code_key" ON "SkillCategory"("code");

-- CreateIndex
CREATE INDEX "Skill_categoryId_idx" ON "Skill"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRubric_skillId_version_key" ON "SkillRubric"("skillId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SkillDependency_fromSkillId_toSkillId_kind_key" ON "SkillDependency"("fromSkillId", "toSkillId", "kind");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCollaborator_projectId_userId_key" ON "ProjectCollaborator"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEvidence_storageKey_key" ON "ProjectEvidence"("storageKey");

-- CreateIndex
CREATE INDEX "ProjectEvidence_projectId_idx" ON "ProjectEvidence"("projectId");

-- CreateIndex
CREATE INDEX "SkillEvidenceLink_skillId_idx" ON "SkillEvidenceLink"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillEvidenceLink_projectId_skillId_key" ON "SkillEvidenceLink"("projectId", "skillId");

-- CreateIndex
CREATE INDEX "SelfAssessment_userId_skillId_createdAt_idx" ON "SelfAssessment"("userId", "skillId", "createdAt");

-- CreateIndex
CREATE INDEX "PeerReviewRequest_reviewerId_status_idx" ON "PeerReviewRequest"("reviewerId", "status");

-- CreateIndex
CREATE INDEX "PeerReviewRequest_requesterId_idx" ON "PeerReviewRequest"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReview_requestId_key" ON "PeerReview"("requestId");

-- CreateIndex
CREATE INDEX "PeerReview_subjectId_idx" ON "PeerReview"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReviewItem_reviewId_skillId_key" ON "PeerReviewItem"("reviewId", "skillId");

-- CreateIndex
CREATE INDEX "InstructorAssessment_studentId_skillId_idx" ON "InstructorAssessment"("studentId", "skillId");

-- CreateIndex
CREATE INDEX "AIAssessment_userId_createdAt_idx" ON "AIAssessment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AISkillSuggestion_skillId_idx" ON "AISkillSuggestion"("skillId");

-- CreateIndex
CREATE INDEX "MasterySnapshot_userId_skillId_computedAt_idx" ON "MasterySnapshot"("userId", "skillId", "computedAt");

-- CreateIndex
CREATE INDEX "ExperienceEvent_userId_createdAt_idx" ON "ExperienceEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceEvent_userId_kind_sourceId_key" ON "ExperienceEvent"("userId", "kind", "sourceId");

-- CreateIndex
CREATE INDEX "Reflection_userId_idx" ON "Reflection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCompletion_userId_challengeId_key" ON "ChallengeCompletion"("userId", "challengeId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRubric" ADD CONSTRAINT "SkillRubric_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRubric" ADD CONSTRAINT "SkillRubric_taxonomyVersionId_fkey" FOREIGN KEY ("taxonomyVersionId") REFERENCES "SkillTaxonomyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillDependency" ADD CONSTRAINT "SkillDependency_fromSkillId_fkey" FOREIGN KEY ("fromSkillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillDependency" ADD CONSTRAINT "SkillDependency_toSkillId_fkey" FOREIGN KEY ("toSkillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvidence" ADD CONSTRAINT "ProjectEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEvidenceLink" ADD CONSTRAINT "SkillEvidenceLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEvidenceLink" ADD CONSTRAINT "SkillEvidenceLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEvidenceLink" ADD CONSTRAINT "SkillEvidenceLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ProjectEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfAssessment" ADD CONSTRAINT "SelfAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfAssessment" ADD CONSTRAINT "SelfAssessment_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfAssessment" ADD CONSTRAINT "SelfAssessment_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "SkillRubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewRequest" ADD CONSTRAINT "PeerReviewRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewRequest" ADD CONSTRAINT "PeerReviewRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewRequest" ADD CONSTRAINT "PeerReviewRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewRequestSkill" ADD CONSTRAINT "PeerReviewRequestSkill_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PeerReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewRequestSkill" ADD CONSTRAINT "PeerReviewRequestSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PeerReviewRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewItem" ADD CONSTRAINT "PeerReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PeerReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewItem" ADD CONSTRAINT "PeerReviewItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewItem" ADD CONSTRAINT "PeerReviewItem_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "SkillRubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorAssessment" ADD CONSTRAINT "InstructorAssessment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorAssessment" ADD CONSTRAINT "InstructorAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorAssessment" ADD CONSTRAINT "InstructorAssessment_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorAssessment" ADD CONSTRAINT "InstructorAssessment_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "SkillRubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAssessment" ADD CONSTRAINT "AIAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISkillSuggestion" ADD CONSTRAINT "AISkillSuggestion_aiAssessmentId_fkey" FOREIGN KEY ("aiAssessmentId") REFERENCES "AIAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceEvent" ADD CONSTRAINT "ExperienceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSkill" ADD CONSTRAINT "ChallengeSkill_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSkill" ADD CONSTRAINT "ChallengeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT "ChallengeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT "ChallengeCompletion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT "ChallengeCompletion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoalSkill" ADD CONSTRAINT "LearningGoalSkill_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoalSkill" ADD CONSTRAINT "LearningGoalSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
