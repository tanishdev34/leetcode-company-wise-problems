"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export function SearchBar({ className, placeholder = "Search questions..." }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (query.length < 2) return;
    debounceRef.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.length >= 2) {
      clearTimeout(debounceRef.current);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <Input value={query} onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown} placeholder={placeholder} className={className} />
  );
}
