"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { TrendingUp, BarChart4, Ticket, Sparkles, LogOut } from "lucide-react"

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogOut() {
    localStorage.removeItem("verity_admin_auth_token")
    toast.success("Logged out successfully.")
    window.location.reload()
  }

  const navItems = [
    { label: "Home", href: "/", icon: TrendingUp, active: pathname === "/" },
    {
      label: "Metrics",
      href: "/metrics",
      icon: BarChart4,
      active: pathname.startsWith("/metrics") || pathname.startsWith("/analytics"),
    },
    {
      label: "Coupons",
      href: "/coupons",
      icon: Ticket,
      active: pathname.startsWith("/coupons"),
    },
    {
      label: "Missions",
      href: "/missions",
      icon: Sparkles,
      active: pathname.startsWith("/missions"),
    },
  ]

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-indigo-600 text-white font-bold text-lg shadow-xs group-hover:bg-indigo-700 transition-colors">
              V
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-stone-900">
                Verity Console
              </h1>
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">
                Admin Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-[2px]">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition-all ${
                    item.active
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <button
          onClick={handleLogOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-stone-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all font-mono text-xs text-stone-500 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </header>
  )
}
