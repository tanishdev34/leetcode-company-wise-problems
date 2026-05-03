import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Starting fast deduplication...")

  const totalBefore = await prisma.question.count()
  const uniqueUrls = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "leetcodeUrl") as count FROM "Question"
  `
  console.log(`Questions before: ${totalBefore}, unique URLs: ${uniqueUrls[0].count}`)
  console.log(`Will collapse ${totalBefore - Number(uniqueUrls[0].count)} duplicate rows`)

  // Step 0: Clean up any orphaned CompanyQuestion records from partial previous run
  console.log("Step 0: Cleaning up orphaned records...")
  const cleaned = await prisma.$executeRaw`
    DELETE FROM "CompanyQuestion" cq
    WHERE NOT EXISTS (SELECT 1 FROM "Question" q WHERE q.id = cq."questionId")
  `
  console.log(`  ${cleaned} orphaned CompanyQuestion records removed`)

  // Step 1: Build canonical map (one canonical question per URL)
  // Pick the question with the most UserQuestions; on tie, pick oldest
  console.log("Step 1: Building canonical map...")
  await prisma.$executeRaw`
    CREATE TEMP TABLE canonical_map AS
    WITH ranked AS (
      SELECT
        q.id,
        q."leetcodeUrl",
        COUNT(uq.id) AS uq_count,
        q."createdAt",
        ROW_NUMBER() OVER (
          PARTITION BY q."leetcodeUrl"
          ORDER BY COUNT(uq.id) DESC, q."createdAt" ASC
        ) AS rn
      FROM "Question" q
      LEFT JOIN "UserQuestion" uq ON uq."questionId" = q.id
      GROUP BY q.id, q."leetcodeUrl", q."createdAt"
    )
    SELECT id AS canonical_id, "leetcodeUrl" AS url
    FROM ranked
    WHERE rn = 1
  `

  // Step 2: Create all CompanyQuestion records in one INSERT
  console.log("Step 2: Creating CompanyQuestion records...")
  const cqInserted = await prisma.$executeRaw`
    INSERT INTO "CompanyQuestion" (id, "questionId", "companyId", "timePeriod", frequency)
    SELECT
      gen_random_uuid(),
      cm.canonical_id,
      q."companyId",
      q."timePeriod",
      q.frequency
    FROM "Question" q
    JOIN canonical_map cm ON cm.url = q."leetcodeUrl"
    ON CONFLICT ("questionId", "companyId", "timePeriod") DO UPDATE SET frequency = EXCLUDED.frequency
  `
  console.log(`  ${cqInserted} CompanyQuestion records upserted`)

  // Step 3: Move non-conflicting UserQuestions to canonical question
  console.log("Step 3: Moving UserQuestions to canonical...")
  const movedUQs = await prisma.$executeRaw`
    UPDATE "UserQuestion" uq
    SET "questionId" = cm.canonical_id
    FROM "Question" dup_q
    JOIN canonical_map cm ON cm.url = dup_q."leetcodeUrl"
    WHERE uq."questionId" = dup_q.id
      AND dup_q.id != cm.canonical_id
      AND NOT EXISTS (
        SELECT 1 FROM "UserQuestion" uq2
        WHERE uq2."questionId" = cm.canonical_id
          AND uq2."userId" = uq."userId"
      )
  `
  console.log(`  ${movedUQs} UserQuestions moved to canonical`)

  // Step 4: Merge conflicting UserQuestions (same user has both canonical and dup)
  console.log("Step 4: Merging conflicting UserQuestions...")
  const merged = await prisma.$executeRaw`
    UPDATE "UserQuestion" can_uq
    SET
      solved = can_uq.solved OR dup_uq.solved,
      "solvedAt" = GREATEST(can_uq."solvedAt", dup_uq."solvedAt"),
      notes = COALESCE(NULLIF(can_uq.notes, ''), dup_uq.notes),
      code = COALESCE(NULLIF(can_uq.code, ''), dup_uq.code)
    FROM "UserQuestion" dup_uq
    JOIN "Question" dup_q ON dup_uq."questionId" = dup_q.id
    JOIN canonical_map cm ON cm.url = dup_q."leetcodeUrl"
    WHERE can_uq."questionId" = cm.canonical_id
      AND dup_q.id != cm.canonical_id
      AND can_uq."userId" = dup_uq."userId"
  `
  console.log(`  ${merged} conflicting UserQuestions merged`)

  // Step 5: Delete duplicate questions (cascades any remaining UserQuestions)
  console.log("Step 5: Deleting duplicate questions...")
  const deleted = await prisma.$executeRaw`
    DELETE FROM "Question" q
    USING canonical_map cm
    WHERE q."leetcodeUrl" = cm.url
      AND q.id != cm.canonical_id
  `
  console.log(`  ${deleted} duplicate questions deleted`)

  const totalAfter = await prisma.question.count()
  const cqTotal = await prisma.companyQuestion.count()
  console.log(`\nDone!`)
  console.log(`Questions: ${totalBefore} → ${totalAfter}`)
  console.log(`CompanyQuestion records: ${cqTotal}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
