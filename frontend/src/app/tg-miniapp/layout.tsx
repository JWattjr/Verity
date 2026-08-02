import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Verity Pre-Season",
  description:
    "Claim your Verity place, pick your club, and invite your football rivals.",
  robots: { index: false, follow: false },
}

export default function TelegramMiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  )
}
