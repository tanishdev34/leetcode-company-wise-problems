"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCodeforcesUsername } from "@/actions/codeforces";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CodeforcesUsernameFormProps {
  initialValue?: string;
}

export function CodeforcesUsernameForm({
  initialValue,
}: CodeforcesUsernameFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialValue || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setStatus("idle");

    const result = await saveCodeforcesUsername(username);

    setLoading(false);
    if (result.success) {
      setStatus("success");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Failed to save");
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3">Link Codeforces Account</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Enter Codeforces handle"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={loading || !username.trim()}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </form>
      {status === "success" && (
        <p className="text-sm text-green-500 mt-2">Saved!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive mt-2">{errorMsg}</p>
      )}
    </Card>
  );
}
