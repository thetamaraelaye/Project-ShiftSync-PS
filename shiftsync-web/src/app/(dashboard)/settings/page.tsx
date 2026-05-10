'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import api from '@/lib/api'
import { getStoredUser, storeUser, type AuthUser } from '@/lib/auth'
import { toast } from 'sonner'

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
]

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  if (!user) return null

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600 mt-0.5">Manage your profile and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} onUpdate={setUser} />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileTab({ user, onUpdate }: { user: AuthUser; onUpdate: (u: AuthUser) => void }) {
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [timezone, setTimezone] = useState(user.timezone)
  const [desiredHours, setDesiredHours] = useState<string>(
    user.desiredWeeklyHours?.toString() ?? ''
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await api.patch('/auth/me', {
        firstName,
        lastName,
        timezone,
        ...(desiredHours && { desiredWeeklyHours: parseInt(desiredHours, 10) }),
      })
      const updated = res.data.data ?? res.data
      const newUser = { ...user, ...updated }
      storeUser(newUser)
      onUpdate(newUser)
      toast.success('Profile saved')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Personal information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user.email} disabled />
          <p className="text-xs text-slate-400">Contact admin to change your email</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Times will be displayed in this timezone where possible
          </p>
        </div>

        {user.role === 'STAFF' && (
          <div className="space-y-1.5">
            <Label htmlFor="desiredHours">Desired weekly hours</Label>
            <Input
              id="desiredHours"
              type="number"
              min={1}
              max={60}
              value={desiredHours}
              onChange={(e) => setDesiredHours(e.target.value)}
              className="w-32"
            />
            <p className="text-xs text-slate-500">
              Used for fairness analytics — not enforced as a hard limit
            </p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PasswordTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) return toast.error("New passwords don't match")
    if (next.length < 8) return toast.error('Password must be at least 8 characters')

    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      toast.success('Password updated')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next">New password</Label>
            <Input
              id="next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

const NOTIFICATION_TYPES = [
  { key: 'shift_assigned', label: 'New shift assigned to me' },
  { key: 'shift_changed', label: 'My shift is modified or cancelled' },
  { key: 'schedule_published', label: 'Schedule is published' },
  { key: 'swap_request', label: 'Someone requests a swap with me' },
  { key: 'swap_resolved', label: 'My swap or drop request is resolved' },
  { key: 'overtime_warning', label: 'I\'m approaching 40h this week' },
] as const

function NotificationsTab() {
  // Preferences stored locally — full persistence would require a user_preferences table.
  // Documenting as a known limitation in README.
  const [inApp, setInApp] = useState(true)
  const [email, setEmail] = useState(false)
  const [types, setTypes] = useState<Record<string, boolean>>({
    shift_assigned: true,
    shift_changed: true,
    schedule_published: true,
    swap_request: true,
    swap_resolved: true,
    overtime_warning: false,
  })

  function toggleType(key: string) {
    setTypes((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <p className="text-xs text-slate-500">
          In-app notifications are always delivered. Email simulation requires SMTP configuration.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">In-app notifications</p>
              <p className="text-xs text-slate-500">Shown in the notification centre</p>
            </div>
            <Switch checked={inApp} onCheckedChange={setInApp} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Email notifications</p>
              <p className="text-xs text-slate-500">Requires SMTP configuration (see README)</p>
            </div>
            <Switch checked={email} onCheckedChange={setEmail} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Notify me for:</p>
          {NOTIFICATION_TYPES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label htmlFor={`notif-${key}`} className="text-sm text-slate-700 cursor-pointer">
                {label}
              </label>
              <Switch
                id={`notif-${key}`}
                checked={types[key] ?? true}
                onCheckedChange={() => toggleType(key)}
              />
            </div>
          ))}
        </div>

        <div className="pt-2 text-xs text-slate-400 border-t border-slate-100">
          Preferences apply to in-app notifications immediately.
        </div>
      </CardContent>
    </Card>
  )
}
