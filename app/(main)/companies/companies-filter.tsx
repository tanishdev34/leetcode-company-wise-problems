"use client";

import { useState } from "react";
import { CompanyCard } from "@/components/company-card";
import { Input } from "@/components/ui/input";

interface CompaniesFilterProps {
  companies: { name: string; slug: string; questionCount: number }[];
}

export function CompaniesFilter({ companies }: CompaniesFilterProps) {
  const [filter, setFilter] = useState("");
  const filtered = filter
    ? companies.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : companies;

  return (
    <>
      <Input
        placeholder="Filter companies..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-6 max-w-md"
      />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((c) => (
          <CompanyCard key={c.slug} name={c.name} slug={c.slug} questionCount={c.questionCount} />
        ))}
      </div>
    </>
  );
}