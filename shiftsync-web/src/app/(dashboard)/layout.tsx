'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { TopBar } from '@/components/top-bar'
import { RoleSwitcher } from '@/components/role-switcher'
import { Providers } from '@/components/providers'
import { useUnreadCount } from '@/hooks/useNotifications'
import { useRealtime } from '@/hooks/useRealtime'
import { isAuthenticated } from '@/lib/auth'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: unreadCount = 0 } = useUnreadCount()

  useRealtime()

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          notificationCount={unreadCount}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300 pb-12',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <TopBar
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Demo role-switcher bar — evaluator convenience */}
      <RoleSwitcher />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return null

  return (
    <Providers>
      <DashboardInner>{children}</DashboardInner>
    </Providers>
  )
}
