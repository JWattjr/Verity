import type { Metadata, Viewport } from "next"
import { Archivo, Big_Shoulders, Martian_Mono } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import AppProviders from "@/components/providers/AppProviders"
import AppShell from "@/components/layout/AppShell"
import { ShowcaseModeProvider } from "@/hooks/useShowcaseMode"

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
})

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
})

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://veritymarket.vercel.app"),
  title: "Verity | PVP Arena and Prediction Markets",
  description:
    "Make your picks, build your record, and climb the Verity leaderboard.",
  applicationName: "Verity",
  keywords: [
    "Verity",
    "prediction markets",
    "PVP Arena",
    "Arc testnet",
    "USDC",
    "community signals",
  ],
  icons: {
    icon: [{ url: "/icon", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Verity | PVP Arena and Prediction Markets",
    description:
      "Make your picks, build your record, and climb the Verity leaderboard.",
    url: "https://veritymarket.vercel.app",
    siteName: "Verity",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Verity social prediction markets preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verity | PVP Arena and Prediction Markets",
    description:
      "Make your picks, build your record, and climb the Verity leaderboard.",
    images: ["/twitter-image"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const forwardedHost = requestHeaders.get("x-forwarded-host")
  const requestHost = (forwardedHost ?? requestHeaders.get("host") ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase()
  const showcaseMode =
    requestHost === "trycloudflare.com" ||
    requestHost.endsWith(".trycloudflare.com")

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bigShoulders.variable} ${martianMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen overflow-y-scroll bg-background text-foreground"
        suppressHydrationWarning
      >
        <ShowcaseModeProvider enabled={showcaseMode}>
          <AppProviders>
            <AppShell>{children}</AppShell>
          </AppProviders>
        </ShowcaseModeProvider>
      </body>
    </html>
  )
}
