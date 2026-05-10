"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Users,
  Shield,
  BarChart3,
  FileText,
  Bell,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getStoredUser, type UserRole } from "@/lib/auth"

const navItems: Array<{
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { name: "Schedule", href: "/schedule", icon: Calendar, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { name: "Staff", href: "/staff", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { name: "Coverage", href: "/coverage", icon: Shield, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
  { name: "Audit", href: "/audit", icon: FileText, roles: ["ADMIN"] },
  { name: "Notifications", href: "/notifications", icon: Bell, roles: ["ADMIN", "MANAGER", "STAFF"] },
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const role = getStoredUser()?.role ?? "STAFF"
  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#0F172A] transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500 text-white font-bold">
              S
            </div>
            <span className="text-lg font-semibold text-white">ShiftSync</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="size-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sky-500/10 text-sky-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
