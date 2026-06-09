-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TimePeriod" AS ENUM ('THIRTY_DAYS', 'THREE_MONTHS', 'SIX_MONTHS', 'MORE_THAN_SIX_MONTHS', 'ALL');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "leetcodeUsername" TEXT,
    "codeforcesUsername" TEXT,
    "emailSubscribed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleSlug" TEXT,
    "leetcodeUrl" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "topics" TEXT[],
    "acceptanceRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyQuestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "timePeriod" "TimePeriod" NOT NULL,
    "frequency" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "code" TEXT,
    "language" TEXT NOT NULL DEFAULT 'cpp',
    "hints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plan_item" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 3,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'cpp',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "correctness" TEXT,
    "timeComplexity" TEXT,
    "spaceComplexity" TEXT,
    "edgeCases" TEXT,
    "explanation" TEXT,
    "followUps" TEXT,
    "suggestions" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solution_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "type" TEXT NOT NULL DEFAULT 'solo',
    "roomCode" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'leetcode',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "sync_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "goalType" TEXT NOT NULL DEFAULT 'company',
    "companyId" TEXT,
    "topicSlug" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dailyQuestionTarget" INTEGER NOT NULL DEFAULT 3,
    "studyDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "strategy" TEXT NOT NULL DEFAULT 'balanced',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_item" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "sourceReason" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_event" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Question_titleSlug_key" ON "Question"("titleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Question_leetcodeUrl_key" ON "Question"("leetcodeUrl");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "AnalysisJob_userId_questionId_status_idx" ON "AnalysisJob"("userId", "questionId", "status");

-- CreateIndex
CREATE INDEX "AnalysisJob_userId_questionId_createdAt_idx" ON "AnalysisJob"("userId", "questionId", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyQuestion_questionId_idx" ON "CompanyQuestion"("questionId");

-- CreateIndex
CREATE INDEX "CompanyQuestion_companyId_idx" ON "CompanyQuestion"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyQuestion_questionId_companyId_timePeriod_key" ON "CompanyQuestion"("questionId", "companyId", "timePeriod");

-- CreateIndex
CREATE INDEX "UserQuestion_userId_idx" ON "UserQuestion"("userId");

-- CreateIndex
CREATE INDEX "UserQuestion_questionId_idx" ON "UserQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestion_userId_questionId_key" ON "UserQuestion"("userId", "questionId");

-- CreateIndex
CREATE INDEX "study_plan_userId_idx" ON "study_plan"("userId");

-- CreateIndex
CREATE INDEX "study_plan_item_planId_idx" ON "study_plan_item"("planId");

-- CreateIndex
CREATE INDEX "study_plan_item_questionId_idx" ON "study_plan_item"("questionId");

-- CreateIndex
CREATE INDEX "review_item_userId_nextReviewAt_idx" ON "review_item"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_item_userId_questionId_key" ON "review_item"("userId", "questionId");

-- CreateIndex
CREATE INDEX "solution_review_userId_questionId_idx" ON "solution_review"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_session_roomCode_key" ON "interview_session"("roomCode");

-- CreateIndex
CREATE INDEX "interview_session_userId_status_idx" ON "interview_session"("userId", "status");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "sync_run_userId_idx" ON "sync_run"("userId");

-- CreateIndex
CREATE INDEX "sync_run_userId_startedAt_idx" ON "sync_run"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "roadmap_userId_idx" ON "roadmap"("userId");

-- CreateIndex
CREATE INDEX "roadmap_userId_status_idx" ON "roadmap"("userId", "status");

-- CreateIndex
CREATE INDEX "roadmap_item_roadmapId_idx" ON "roadmap_item"("roadmapId");

-- CreateIndex
CREATE INDEX "roadmap_item_questionId_idx" ON "roadmap_item"("questionId");

-- CreateIndex
CREATE INDEX "roadmap_item_roadmapId_plannedDate_idx" ON "roadmap_item"("roadmapId", "plannedDate");

-- CreateIndex
CREATE INDEX "roadmap_event_roadmapId_idx" ON "roadmap_event"("roadmapId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyQuestion" ADD CONSTRAINT "CompanyQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyQuestion" ADD CONSTRAINT "CompanyQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestion" ADD CONSTRAINT "UserQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestion" ADD CONSTRAINT "UserQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plan" ADD CONSTRAINT "study_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plan_item" ADD CONSTRAINT "study_plan_item_planId_fkey" FOREIGN KEY ("planId") REFERENCES "study_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plan_item" ADD CONSTRAINT "study_plan_item_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_review" ADD CONSTRAINT "solution_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_review" ADD CONSTRAINT "solution_review_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_run" ADD CONSTRAINT "sync_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap" ADD CONSTRAINT "roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap" ADD CONSTRAINT "roadmap_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item" ADD CONSTRAINT "roadmap_item_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_event" ADD CONSTRAINT "roadmap_event_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
