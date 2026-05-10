'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUsers, useUser } from '@/hooks/useUsers'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-800',
  MANAGER: 'bg-fuchsia-100 text-fuchsia-800',
  STAFF: 'bg-slate-100 text-slate-700',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INVITED: 'bg-amber-100 text-amber-700',
  DEACTIVATED: 'bg-slate-100 text-slate-500',
}

export default function StaffPage() {
  const router = useRouter()
  const user = getStoredUser()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === 'STAFF') {
      router.replace('/dashboard')
    }
  }, [router, user?.role])

  if (user?.role === 'STAFF') return null

  const { data, isLoading } = useUsers()
  const users = data ?? []

  const filtered = users.filter((u: any) => {
    const q = search.toLowerCase()
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff Directory</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {users.length} {users.length === 1 ? 'staff member' : 'staff members'}
        </p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="size-5 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No staff found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Skills</th>
                  <th className="px-4 py-2.5">Locations</th>
                  <th className="px-4 py-2.5">Desired Hours</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs bg-slate-200 text-slate-700">
                            {u.firstName[0]}
                            {u.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-900">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('border-0 text-xs', ROLE_COLORS[u.role])}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.skills?.slice(0, 3).map((s: any, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] px-1 h-4 border-slate-200"
                          >
                            {(s.skill ?? s).replace('_', ' ')}
                          </Badge>
                        ))}
                        {(u.skills?.length ?? 0) > 3 && (
                          <span className="text-xs text-slate-500">+{u.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.locationLinks?.length ?? 0} location{u.locationLinks?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.desiredWeeklyHours ? `${u.desiredWeeklyHours}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('border-0 text-xs', STATUS_COLORS[u.status])}>
                        {u.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StaffDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function StaffDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data: user, isLoading } = useUser(userId)

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
        {isLoading || !user ? (
          <div className="flex items-center justify-center h-full p-6">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="px-6 pb-6">
            <SheetHeader className="px-0 pt-6">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-violet-100 text-violet-700 text-base font-semibold">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl tracking-tight text-slate-900">
                    {user.firstName} {user.lastName}
                  </SheetTitle>
                  <p className="text-sm text-slate-600 mt-0.5">{user.email}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              <DetailRow label="Role">
                <Badge className={cn('border-0 text-xs', ROLE_COLORS[user.role])}>{user.role}</Badge>
              </DetailRow>
              <DetailRow label="Status">
                <Badge className={cn('border-0 text-xs', STATUS_COLORS[user.status])}>
                  {user.status}
                </Badge>
              </DetailRow>
              <DetailRow label="Timezone">{user.timezone}</DetailRow>
              <DetailRow label="Desired weekly hours">
                {user.desiredWeeklyHours ? `${user.desiredWeeklyHours}h` : '—'}
              </DetailRow>

              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills?.length ? (
                    user.skills.map((s: any, i: number) => (
                      <Badge key={i} variant="outline" className="border-slate-200">
                        {(s.skill ?? s).replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No skills set</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Locations
                </div>
                <div className="space-y-1.5">
                  {user.locationLinks?.length ? (
                    user.locationLinks.map((l: any) => (
                      <div
                        key={l.id ?? `${l.locationId}-${l.type}`}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-md text-sm"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {l.location?.name ?? '—'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {l.location?.city ?? ''} {l.location?.timezone ? `· ${l.location.timezone}` : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-slate-200">
                          {l.type}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No locations assigned</span>
                  )}
                </div>
              </div>

              <Link href={`/staff/${user.id}/availability`} className="block">
                <Button variant="outline" className="w-full h-10">
                  <Calendar className="size-4 mr-2" />
                  View Availability
                </Button>
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="text-slate-900 font-semibold">{children}</span>
    </div>
  )
}
