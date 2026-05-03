import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  if (!query || query.length < 2) {
    return NextResponse.json({ questions: [], totalPages: 0, currentPage: 1 });
  }

  try {
    const questions = await prisma.$queryRaw`
      SELECT
        q.id,
        q.title,
        q."leetcodeUrl",
        q.difficulty,
        q.topics,
        q."acceptanceRate",
        (SELECT MAX(cq.frequency) FROM "CompanyQuestion" cq WHERE cq."questionId" = q.id) AS frequency,
        (SELECT c.name FROM "CompanyQuestion" cq JOIN "Company" c ON cq."companyId" = c.id WHERE cq."questionId" = q.id ORDER BY cq.frequency DESC LIMIT 1) AS "companyName",
        (SELECT c.slug FROM "CompanyQuestion" cq JOIN "Company" c ON cq."companyId" = c.id WHERE cq."questionId" = q.id ORDER BY cq.frequency DESC LIMIT 1) AS "companySlug",
        similarity(q.title, ${query}) as score
      FROM "Question" q
      WHERE q.title % ${query}
      ORDER BY score DESC, frequency DESC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Question" q
      WHERE q.title % ${query}
    `;

    const totalQuestions = Number(countResult[0].count);
    const totalPages = Math.ceil(totalQuestions / pageSize);

    return NextResponse.json({ questions, totalPages, currentPage: page });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
