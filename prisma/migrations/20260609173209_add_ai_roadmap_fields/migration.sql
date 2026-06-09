-- AlterTable
ALTER TABLE "roadmap" ADD COLUMN     "aiPlanJson" JSONB,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "feasibility" TEXT NOT NULL DEFAULT 'realistic',
ADD COLUMN     "feasibilityNote" TEXT,
ADD COLUMN     "generationError" TEXT,
ADD COLUMN     "generationStatus" TEXT NOT NULL DEFAULT 'done',
ADD COLUMN     "intensity" TEXT NOT NULL DEFAULT 'balanced',
ADD COLUMN     "prompt" TEXT;

-- AlterTable
ALTER TABLE "roadmap_item" ADD COLUMN     "aiReason" TEXT,
ADD COLUMN     "dayTheme" TEXT,
ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'new_question';

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
