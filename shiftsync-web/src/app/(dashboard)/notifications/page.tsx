'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ArrowLeftRight,
  CheckCircle,
  Users,
  AlertTriangle,
  Loader2,
  CheckCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const ICONS: Record<string, { icon: any; color: string }> = {
  SHIFT_ASSIGNED:       { icon: CalendarCheck,  color: 'bg-emerald-100 text-emerald-700' },
  SHIFT_CHANGED:        { icon: CalendarClock,   color: 'bg-amber-100 text-amber-700' },
  SHIFT_UNASSIGNED:     { icon: CalendarX,       color: 'bg-red-100 text-red-700' },
  SCHEDULE_PUBLISHED:   { icon: CalendarCheck,   color: 'bg-violet-100 text-violet-700' },
  SCHEDULE_UNPUBLISHED: { icon: CalendarX,       color: 'bg-slate-100 text-slate-700' },
  SWAP_REQUEST:         { icon: ArrowLeftRight,  color: 'bg-violet-100 text-violet-700' },
  SWAP_ACCEPTED:        { icon: CheckCircle,     color: 'bg-teal-100 text-teal-700' },
  SWAP_RESOLVED:        { icon: CheckCircle,     color: 'bg-emerald-100 text-emerald-700' },
  COVERAGE_REQUEST:     { icon: Users,           color: 'bg-amber-100 text-amber-700' },
  OVERTIME_WARNING:     { icon: AlertTriangle,   color: 'bg-red-100 text-red-700' },
  AVAILABILITY_CHANGED: { icon: CalendarClock,   color: 'bg-slate-100 text-slate-700' },
  GENERAL:              { icon: Bell,            color: 'bg-slate-100 text-slate-700' },
}

function groupByDate(notifications: any[]) {
  const groups: Record<string, any[]> = {}
  notifications.forEach((n) => {
    const d = new Date(n.createdAt)
    let key = format(d, 'MMM d, yyyy')
    if (isToday(d)) key = 'Today'
    else if (isYesterday(d)) key = 'Yesterday'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })
  return groups
}

// De-duplicate by title+message+date (seed may create duplicate entries)
function deduplicate(notifications: any[]): any[] {
  const seen = new Set<string>()
  return notifications.filter((n) => {
    const key = `${n.title}|${n.message}|${format(new Date(n.createdAt), 'yyyy-MM-dd')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function NotificationsPage() {
  const router = useRouter()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const raw = data ?? []
  const notifications = deduplicate(raw)
  const unread = notifications.filter((n: any) => !n.isRead)
  const unreadCount = unread.length

  const filtered = unreadOnly ? unread : notifications

  function handleClick(n: any) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.metadata?.shiftId) router.push('/schedule')
    else if (n.metadata?.requestId) router.push('/coverage')
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-violet-600 text-white border-0 h-6 px-2 text-xs font-bold">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {notifications.length} total · {unreadCount} unread · {notifications.length - unreadCount} read
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Unread filter toggle */}
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
              unreadOnly
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700'
            )}
          >
            {unreadOnly ? '✓ Unread only' : 'Unread only'}
          </button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              className="text-xs"
            >
              <CheckCheck className="size-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 border-slate-200">
          <Loader2 className="size-5 animate-spin mx-auto mb-2" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 border-slate-200">
          <Bell className="size-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          </p>
          {unreadOnly && (
            <button
              onClick={() => setUnreadOnly(false)}
              className="text-xs text-violet-600 mt-2 hover:underline"
            >
              Show all notifications
            </button>
          )}
        </Card>
      ) : (
        Object.entries(groupByDate(filtered)).map(([group, items]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group}</h3>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>

            <Card className="border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {items.map((n: any) => {
                  const config = ICONS[n.type] ?? ICONS.GENERAL
                  const Icon = config.icon
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors group',
                        // Unread: violet left border + very light tint
                        !n.isRead && 'border-l-[3px] border-l-violet-500 bg-violet-50/30 hover:bg-violet-50/60',
                        n.isRead && 'border-l-[3px] border-l-transparent'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn('shrink-0 rounded-full p-2 mt-0.5', config.color)}>
                        <Icon className="size-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            'text-sm truncate',
                            !n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                          )}>
                            {n.title}
                          </p>
                          <span className="text-xs text-slate-400 shrink-0 ml-2">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!n.isRead && (
                        <div className="size-2 rounded-full bg-violet-500 shrink-0 mt-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
