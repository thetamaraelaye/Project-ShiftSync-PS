'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getStoredUser, getInitials, getRoleLabel, logout, type UserRole } from '@/lib/auth'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { name: 'Schedule', href: '/schedule', icon: CalendarDays, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { name: 'Staff', href: '/staff', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Coverage', href: '/coverage', icon: ArrowLeftRight, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Audit Logs', href: '/audit', icon: ClipboardList, roles: ['ADMIN'] },
  { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
]

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  notificationCount?: number
}

export function AppSidebar({ isCollapsed, onToggle, notificationCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const user = getStoredUser()
  const role = user?.role ?? 'STAFF'

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  function handleSignOut() {
    logout()
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-[#0F172A] transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 shadow-lg shadow-violet-900/50">
            <CalendarDays className="size-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-base font-semibold text-white truncate">ShiftSync</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <TooltipProvider delayDuration={0}>
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              const showBadge = item.name === 'Notifications' && notificationCount > 0

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-500/15 text-violet-300 border-l-2 border-violet-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                    isCollapsed && 'justify-center px-2 border-l-0'
                  )}
                >
                  <div className="relative shrink-0">
                    <Icon className="size-5" />
                    {showBadge && isCollapsed && (
                      <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      {showBadge && (
                        <Badge className="h-5 min-w-5 justify-center px-1.5 bg-red-500 text-white text-xs">
                          {notificationCount > 9 ? '9+' : notificationCount}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              )

              if (isCollapsed) {
                return (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                        {item.name}
                        {showBadge && ` (${notificationCount})`}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }
              return <li key={item.name}>{linkContent}</li>
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* User card + collapse */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {/* User info */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-violet-700 text-white text-xs font-medium">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{getRoleLabel(user.role)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="shrink-0 size-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full text-slate-500 hover:bg-slate-800 hover:text-slate-300 text-xs',
            isCollapsed && 'px-2'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4 mr-1.5" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
