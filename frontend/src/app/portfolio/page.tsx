"use client"

import PortfolioDashboard from "@/components/porfolio/PortfolioDashboard"
import LivePortfolioPreview from "@/components/preview/LivePortfolioPreview"
import { useShowcaseMode } from "@/hooks/useShowcaseMode"

export default function WalletPage() {
  const showcaseMode = useShowcaseMode()

  return showcaseMode ? <LivePortfolioPreview /> : <PortfolioDashboard />
}
