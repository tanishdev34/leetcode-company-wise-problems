import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tanish.leetcode',
  appName: 'LC Grind',
  webDir: 'www',
  server: {
    url: 'https://lc-grind.vercel.app',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'lc-grind.vercel.app',
      'accounts.google.com',
      '*.googleusercontent.com',
    ],
  },
  android: {
    allowMixedContent: false,
    // `LCGrind/1.0` suffix lets the web app detect mobile context as a fallback
    // (primary detection is Capacitor.isNativePlatform()).
    appendUserAgent: 'LCGrind/1.0',
  },
  plugins: {
    Browser: {},
    GoogleAuth: {
      // The WEB OAuth client ID — same one Better Auth uses on the server.
      // This is the audience baked into the ID token, so the server can verify it.
      // Public value, safe to commit.
      serverClientId: '163873995064-g9l8r8i3r8p5d3pt9gjomr0t4pe04snk.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
