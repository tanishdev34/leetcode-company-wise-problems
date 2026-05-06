"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getEmailSubscription, toggleEmailSubscription } from "@/actions/email";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function EmailSubscriptionToggle() {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    getEmailSubscription().then((result) => {
      if (result.success) {
        setSubscribed(result.data.subscribed);
      }
      setLoading(false);
    });
  }, []);

  async function handleToggle() {
    setToggling(true);
    const result = await toggleEmailSubscription();
    if (result.success) {
      setSubscribed(result.data.subscribed);
      router.refresh();
    }
    setToggling(false);
  }

  if (loading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant={subscribed ? "default" : "outline"}
      onClick={handleToggle}
      disabled={toggling}
      className="gap-2"
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {subscribed ? "Subscribed" : "Subscribe to Email Updates"}
    </Button>
  );
}
