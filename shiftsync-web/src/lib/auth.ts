'use client'

import api from './api'

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  timezone: string
  desiredWeeklyHours?: number | null
  skills?: string[]
  managedLocationIds?: string[]
}

const USER_KEY = 'user'
const TOKEN_KEY = 'access_token_fallback'

// ─── User info storage (NOT the token — that's in an httpOnly cookie) ───────
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  // We can't directly check the httpOnly cookie. Use the presence of stored user
  // info as a proxy. Server still validates the cookie on each request.
  return !!getStoredUser()
}

// ─── Auth actions ───────────────────────────────────────────────────────────
export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Ignore — we're logging out either way
  }
  clearToken()
  clearUser()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// ─── UI helpers ─────────────────────────────────────────────────────────────
export function getFullName(user: AuthUser | null): string {
  if (!user) return ''
  return `${user.firstName} ${user.lastName}`
}

export function getInitials(user: AuthUser | null): string {
  if (!user) return '?'
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
}

export function getRoleLabel(role: UserRole): string {
  return { ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Staff' }[role]
}

export function getRoleColor(role: UserRole): string {
  return {
    ADMIN: 'bg-violet-100 text-violet-800',
    MANAGER: 'bg-fuchsia-100 text-fuchsia-800',
    STAFF: 'bg-slate-100 text-slate-700',
  }[role]
}

// ─── Demo accounts (used by login page + role-switcher bar) ─────────────────
export const DEMO_ACCOUNTS = {
  ADMIN: { email: 'admin@coastal-eats.com', password: 'Password123!', label: 'Admin' },
  MANAGER: { email: 'manager.sf@coastal-eats.com', password: 'Password123!', label: 'Manager SF' },
  STAFF: { email: 'sarah@coastal-eats.com', password: 'Password123!', label: 'Staff (Sarah)' },
} as const
