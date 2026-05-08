import { Geist, JetBrains_Mono } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { MobilePullToRefresh } from "@/components/mobile-pull-to-refresh"
import { cn } from "@/lib/utils";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body>
        <Script defer src="https://cloud.umami.is/script.js" data-website-id="65dc31c1-8efa-49ce-b7a1-46d7ccee5d33" />
        <ThemeProvider>
          <MobilePullToRefresh />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
