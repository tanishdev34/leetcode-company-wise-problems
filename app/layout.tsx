import { Doto, JetBrains_Mono } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { MobilePullToRefresh } from "@/components/mobile-pull-to-refresh"
import { OfflineBanner } from "@/components/offline-banner"
import { cn } from "@/lib/utils";

const doto = Doto({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-display",
})

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-sans'})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", doto.variable, "font-sans", jetbrainsMono.variable)}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Script defer src="https://cloud.umami.is/script.js" data-website-id="65dc31c1-8efa-49ce-b7a1-46d7ccee5d33" />
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js');
            });
          }`}
        </Script>
        <ThemeProvider>
          <MobilePullToRefresh />
          {children}
        </ThemeProvider>
        <OfflineBanner />
      </body>
    </html>
  )
}
