"use client";

import { useEffect } from "react";

export function MobilePullToRefresh() {
  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      if (cancelled) return;

      // @ts-expect-error pulltorefreshjs has no types
      const PullToRefresh = (await import("pulltorefreshjs")).default;

      const instance = PullToRefresh.init({
        mainElement: "body",
        instructionsPullToRefresh: "Pull down to refresh",
        instructionsReleaseToRefresh: "Release to refresh",
        instructionsRefreshing: "Refreshing…",
        distThreshold: 70,
        distMax: 90,
        onRefresh() {
          window.location.reload();
        },
      });

      destroy = () => instance.destroy();
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return null;
}
