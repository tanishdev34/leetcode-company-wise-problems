# LC Grind — Android shell

Capacitor wrapper that loads `https://lc-grind.vercel.app` inside a native Android app.

The web app stays on Vercel; this folder owns the native shell + Google Sign-In glue.

---

## Prerequisites

- **JDK 17** (`brew install --cask temurin@17`) — Android Gradle Plugin requires 17 or 21. JDK 22+ won't work.
- **Android Studio** + Android SDK 34+ (install via SDK Manager).
- `~/.zshrc`:
   ```
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```
- Phone with USB debugging on (Settings → About → tap Build Number 7×, then enable USB debug in Developer options).

## Setup (one-time)

```bash
cd mobile
bun install
npx cap add android         # if android/ doesn't exist yet
npx cap sync android
```

## Run on phone

```bash
npx cap run android
```

Or `npx cap open android` to use Android Studio.

## After config or plugin changes

```bash
npx cap sync android
```

You do **not** rebuild for web changes — those ship via Vercel.

---

## Google Sign-In setup (REQUIRED)

WebView OAuth doesn't work — Google fingerprints the WebView and rejects it. We use the native Google Sign-In SDK instead, which returns an ID token; the server verifies it via Better Auth and issues a session cookie.

### 1. Get your debug SHA-1

```bash
cd android && ./gradlew signingReport
```

Look for the `debug` variant block — copy the **SHA1** value.

### 2. Google Cloud Console

Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).

**Create an Android OAuth client:**
- Type: **Android**
- Package name: `com.tanish.leetcode`
- SHA-1: (paste from step 1)

You only need to *create* this — you never reference its client ID in code. Its existence is what tells Google to accept native sign-in attempts from your APK signed with that SHA-1.

**Keep your existing Web client** (the one already in your `.env` as `GOOGLE_CLIENT_ID`). The native plugin asks Google to issue an ID token whose `aud` claim equals your Web client ID, so the server-side Better Auth verification (which uses the Web client ID) passes.

### 3. Release builds

When you build a release APK, you'll sign with a different keystore → different SHA-1. Add **another** Android OAuth client in Cloud Console with that release SHA-1, or both auth flows will fail in production. (Same package name, different SHA — Google allows multiple Android clients per package.)

---

## How the sign-in flow works

1. User taps "Continue with Google" in the WebView.
2. `lib/google-signin.ts` (in the web app) detects `Capacitor.isNativePlatform()` and calls `GoogleAuth.signIn()` from the native plugin.
3. Native Google account picker appears; user chooses an account.
4. Plugin returns an **ID token** (signed JWT, audience = your Web client ID).
5. Web code POSTs the token to `/api/auth/mobile-google`.
6. Server route calls `auth.api.signInSocial({ provider: 'google', idToken: { token } })` — Better Auth verifies the JWT signature + audience, creates/links the user, returns `Set-Cookie`.
7. WebView now has the session cookie. `router.push('/dashboard')`.

In a regular browser, the same button does the standard `signIn.social` redirect flow. Both paths converge on the same Better Auth session.

---

## Releasing to Play Store (later)

1. Generate a release keystore (`keytool -genkey ...`) — store outside the repo.
2. Add the release SHA-1 to a new Android OAuth client in Cloud Console.
3. `cd android && ./gradlew bundleRelease` → AAB at `android/app/build/outputs/bundle/release/`.
4. Upload to Play Console → internal testing track first.

## Cookie / session notes

- Session cookie is `Secure; HttpOnly; SameSite=Lax`. Vercel is HTTPS, WebView origin is HTTPS — works.
- WebView's `CookieManager` persists cookies between app launches, so users stay signed in.
- External links (LeetCode problems etc) open in system browser — `allowNavigation` in `capacitor.config.ts` whitelists only your domain + Google OAuth domains.
