"use client";

import { signIn } from "@/lib/auth-client";

const GOOGLE_WEB_CLIENT_ID =
  "163873995064-g9l8r8i3r8p5d3pt9gjomr0t4pe04snk.apps.googleusercontent.com";

let initPromise: Promise<void> | null = null;

async function isCapacitorNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function ensureGoogleAuthInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const { GoogleAuth } = await import(
        "@codetrix-studio/capacitor-google-auth"
      );
      await GoogleAuth.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ["profile", "email"],
        grantOfflineAccess: false,
      });
    })();
  }
  return initPromise;
}

export async function signInWithGoogle(callbackURL = "/dashboard") {
  if (await isCapacitorNative()) {
    await ensureGoogleAuthInitialized();
    const { GoogleAuth } = await import(
      "@codetrix-studio/capacitor-google-auth"
    );
    const result = await GoogleAuth.signIn();
    const idToken = result?.authentication?.idToken;
    if (!idToken) throw new Error("No ID token returned from Google");
    const res = await fetch("/api/auth/mobile-google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        accessToken: result?.authentication?.accessToken,
      }),
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Sign-in failed: ${await res.text()}`);
    // Hard navigation so useSession() and server components both re-read the
    // freshly-set cookie. router.push + router.refresh leaves useSession's
    // client cache stale.
    window.location.href = callbackURL;
    return { redirectTo: callbackURL, hardReload: true };
  }

  await signIn.social({ provider: "google", callbackURL });
  return { redirectTo: null, hardReload: false };
}
