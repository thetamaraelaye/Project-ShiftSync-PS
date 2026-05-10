'use client'

import { useState } from 'react'
import { Shield, Settings, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { storeUser, DEMO_ACCOUNTS, getStoredUser, type UserRole } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'

const ROLES: { role: keyof typeof DEMO_ACCOUNTS; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { role: 'ADMIN', label: 'Admin', icon: Shield },
  { role: 'MANAGER', label: 'Manager', icon: Settings },
  { role: 'STAFF', label: 'Staff', icon: User },
]

export function RoleSwitcher() {
  const [loading, setLoading] = useState<UserRole | null>(null)
  const qc = useQueryClient()
  const currentUser = getStoredUser()

  async function switchRole(role: keyof typeof DEMO_ACCOUNTS) {
    if (loading) return
    setLoading(role as UserRole)
    try {
      const account = DEMO_ACCOUNTS[role]
      const res = await api.post('/auth/login', { email: account.email, password: account.password })
      // Token is set in an httpOnly cookie by the server
      const { user } = res.data.data
      storeUser(user)
      qc.clear()
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Role switch failed', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <span className="text-xs text-slate-400 shrink-0 hidden sm:block">Demo Role Switcher</span>
        <div className="flex items-center gap-1.5 flex-1 justify-center sm:justify-end">
          {ROLES.map(({ role, label, icon: Icon }) => {
            const isActive = currentUser?.role === role
            const isLoading = loading === role
            return (
              <button
                key={role}
                onClick={() => switchRole(role)}
                disabled={!!loading || isActive}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm cursor-default'
                    : 'border border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700',
                  loading && !isLoading && 'opacity-50'
                )}
              >
                {isLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Icon className="size-3" />
                )}
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
