"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getCompanyQuestions } from "@/actions/questions";
import { QuestionTable } from "@/components/question-table";
import { TimePeriodTabs } from "@/components/time-period-tabs";
import { Button } from "@/components/ui/button";

type TimePeriod = "ALL" | "THIRTY_DAYS" | "THREE_MONTHS" | "SIX_MONTHS" | "MORE_THAN_SIX_MONTHS";

export default function CompanyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const initialPeriod = (searchParams.get("period") as TimePeriod) || "ALL";
  const initialPage = parseInt(searchParams.get("page") || "1");

  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<{
    questions: any[]; totalPages: number; currentPage: number;
  }>({ questions: [], totalPages: 0, currentPage: 1 });
  const [loading, setLoading] = useState(true);

  const updateUrl = useCallback(
    (period: TimePeriod, p: number) => {
      const params = new URLSearchParams();
      if (period !== "ALL") params.set("period", period);
      if (p !== 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(`/companies/${slug}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, slug]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    updateUrl(timePeriod, 1);
    getCompanyQuestions(slug, timePeriod, 1)
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
  }, [slug, timePeriod, updateUrl]);

  useEffect(() => {
    if (page === 1) return;
    setLoading(true);
    updateUrl(timePeriod, page);
    getCompanyQuestions(slug, timePeriod, page)
      .then((result) => { if (result.success) setData(result.data); })
      .finally(() => setLoading(false));
  }, [slug, timePeriod, page, updateUrl]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold capitalize">{slug.replace(/-/g, " ")}</h1>
      <div className="mb-6">
        <TimePeriodTabs value={timePeriod} onChange={setTimePeriod} />
      </div>
      <QuestionTable questions={data.questions} isAuthenticated={!!session?.user} loading={loading} />
      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {data.currentPage} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
