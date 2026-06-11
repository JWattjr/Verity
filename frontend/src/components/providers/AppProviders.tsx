"use client"

import { type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/lib/toast"
import { queryClient } from "@/lib/queryClient"
import AuthModals from "./AuthModals"
import TxConfirmModal from "./TxConfirmModal"

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
        {children}
        <AuthModals />
        <TxConfirmModal />
        <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
