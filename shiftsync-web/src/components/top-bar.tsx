"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, Menu, LogOut, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoredUser, getInitials, getFullName, getRoleColor, getRoleLabel, logout } from "@/lib/auth"
import { useUnreadCount } from "@/hooks/useNotifications"

interface TopBarProps {
  onMenuClick: () => void
  showMenuButton: boolean
}

export function TopBar({ onMenuClick, showMenuButton }: TopBarProps) {
  const router = useRouter()
  const user = getStoredUser()
  const { data: unreadCount = 0 } = useUnreadCount()

  const initials = getInitials(user)
  const fullName = getFullName(user)
  const roleLabel = user ? getRoleLabel(user.role) : ''
  const roleColor = user ? getRoleColor(user.role) : ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-[#F8FAFC] px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-slate-600 hover:bg-slate-100"
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold text-slate-900">ShiftSync</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:bg-slate-100"
          onClick={() => router.push('/notifications')}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{unreadCount} unread notifications</span>
        </Button>

        {/* User Avatar with Role */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-slate-100"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-slate-200 text-slate-700 text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold hidden sm:inline-flex ${roleColor}`}
              >
                {roleLabel}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-semibold">{fullName}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="size-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/notifications')}>
              <Bell className="size-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-auto bg-red-100 text-red-700 border-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => logout()}
            >
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
