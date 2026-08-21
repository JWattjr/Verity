"use client"

import { useState, useEffect } from "react"
import AdminHeader from "./AdminHeader"
import LoginPanel from "./LoginPanel"

interface AdminShellProps {
  children: React.ReactNode
}

export default function AdminShell({ children }: AdminShellProps) {
  const [token, setToken] = useState("")
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("verity_admin_auth_token")
    if (stored) {
      setToken(stored)
      setIsAuthorized(true)
    } else {
      setIsAuthorized(false)
    }
  }, [])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500 text-xs font-mono">
        Verifying admin session...
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <LoginPanel
        token={token}
        setToken={setToken}
        setIsAuthorized={setIsAuthorized}
        onSuccess={() => setIsAuthorized(true)}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 flex-1 w-full">
        {children}
      </main>
    </div>
  )
}
