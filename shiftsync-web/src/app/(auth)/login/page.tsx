'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CalendarDays, Loader2, Shield, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import api from '@/lib/api'
import { storeUser, storeToken, DEMO_ACCOUNTS, type AuthUser } from '@/lib/auth'

interface LoginResponse {
  data: {
    user: AuthUser
    accessToken?: string // returned for Swagger; cookie is the source of truth
  }
  message: string
}

const QUICK_LOGINS = [
  { role: 'ADMIN' as const, label: 'Admin', icon: Shield, color: 'border-violet-500/50 hover:bg-violet-500/10 text-violet-300' },
  { role: 'MANAGER' as const, label: 'Manager', icon: Settings, color: 'border-fuchsia-500/50 hover:bg-fuchsia-500/10 text-fuchsia-300' },
  { role: 'STAFF' as const, label: 'Staff', icon: User, color: 'border-slate-500/50 hover:bg-slate-500/10 text-slate-300' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e?: React.FormEvent, overrideEmail?: string, overridePassword?: string) {
    e?.preventDefault()
    setError('')
    setLoading(true)

    const loginEmail = overrideEmail ?? email
    const loginPassword = overridePassword ?? password

    if (!loginEmail || !loginPassword) {
      setError('Please enter your email and password')
      setLoading(false)
      return
    }

    try {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      })

      // Primary auth is the httpOnly cookie; we also persist the bearer token as a
      // fallback for browsers that block third-party cookies in cross-site requests.
      const { user, accessToken } = res.data.data
      if (accessToken) storeToken(accessToken)
      storeUser(user)
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Login failed'
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(role: keyof typeof DEMO_ACCOUNTS) {
    const account = DEMO_ACCOUNTS[role]
    setEmail(account.email)
    setPassword(account.password)
    handleSubmit(undefined, account.email, account.password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute -top-40 -right-40 h-125 w-125 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-125 w-125 rounded-full bg-violet-400/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-900/50">
            <CalendarDays className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ShiftSync</h1>
          <p className="mt-1.5 text-slate-400 text-sm">Multi-Location Workforce Scheduling</p>
        </div>

        {/* Login card */}
        <Card className="border-slate-700/50 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">Sign in to your account</CardTitle>
            <p className="text-sm text-slate-400">Enter your credentials to continue</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Email address</label>
                <Input
                  type="email"
                  placeholder="you@coastal-eats.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-violet-500"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="relative">
              <Separator className="bg-slate-700/60" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-2 text-xs text-slate-500">
                Demo accounts
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 text-center">Quick login with seeded credentials</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_LOGINS.map(({ role, label, icon: Icon, color }) => (
                  <button
                    key={role}
                    onClick={() => quickLogin(role)}
                    disabled={loading}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 text-center">Password: Password123!</p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-600">
          Coastal Eats · ShiftSync v1.0 · Secure authentication
        </p>
      </div>
    </div>
  )
}
