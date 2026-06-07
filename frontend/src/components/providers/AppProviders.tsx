"use client"

import { type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { RightPanelSlotProvider } from "@/hooks/useRightPanelSlot"
import { Toaster } from "react-hot-toast"
import { queryClient } from "@/lib/queryClient"
import AuthModals from "./AuthModals"
import TxConfirmModal from "./TxConfirmModal"

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
        <RightPanelSlotProvider>
          {children}
          <AuthModals />
          <TxConfirmModal />
          <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        </RightPanelSlotProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
