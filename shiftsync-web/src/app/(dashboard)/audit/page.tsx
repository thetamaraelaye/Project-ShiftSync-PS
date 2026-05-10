'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const ACTION_COLORS: Record<string, string> = {
  STAFF_ASSIGNED: 'bg-violet-100 text-violet-700',
  STAFF_UNASSIGNED: 'bg-red-100 text-red-700',
  STAFF_REASSIGNED: 'bg-amber-100 text-amber-700',
  SCHEDULE_PUBLISHED: 'bg-emerald-100 text-emerald-700',
  SCHEDULE_UNPUBLISHED: 'bg-slate-100 text-slate-700',
  SHIFT_CREATED: 'bg-sky-100 text-sky-700',
  SHIFT_UPDATED: 'bg-amber-100 text-amber-700',
  SHIFT_DELETED: 'bg-red-100 text-red-700',
  SWAP_APPROVED: 'bg-emerald-100 text-emerald-700',
  DROP_APPROVED: 'bg-emerald-100 text-emerald-700',
  SWAP_ACCEPTED_BY_TARGET: 'bg-teal-100 text-teal-700',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-800',
  MANAGER: 'bg-fuchsia-100 text-fuchsia-800',
  STAFF: 'bg-slate-100 text-slate-700',
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, page],
    queryFn: () =>
      api
        .get('/audit', {
          params: {
            ...(entityType !== 'all' && { entityType }),
            page,
            limit: 50,
          },
        })
        .then((r) => r.data.data ?? r.data),
  })

  const logs = data?.data ?? data ?? []
  const total = data?.meta?.total ?? logs.length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-600 mt-0.5">Complete history of system changes</p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="flex flex-col sm:flex-row gap-3 p-3">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All entity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Shift">Shifts</SelectItem>
              <SelectItem value="ShiftAssignment">Assignments</SelectItem>
              <SelectItem value="SwapRequest">Swap Requests</SelectItem>
              <SelectItem value="User">Users</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 text-sm text-slate-500 self-center">
            {total} total {total === 1 ? 'entry' : 'entries'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="size-5 animate-spin mx-auto mb-2" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No audit entries found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((entry: any) => {
              const isOpen = expanded === entry.id
              const hasDetails = entry.before || entry.after
              return (
                <div key={entry.id}>
                  <button
                    onClick={() => hasDetails && setExpanded(isOpen ? null : entry.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                  >
                    {hasDetails ? (
                      isOpen ? (
                        <ChevronDown className="size-4 text-slate-400 mt-1 shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 text-slate-400 mt-1 shrink-0" />
                      )
                    ) : (
                      <div className="size-4 shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            'border-0 text-xs',
                            ACTION_COLORS[entry.action] ?? 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {entry.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">on {entry.entityType}</span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {format(new Date(entry.createdAt), 'MMM d, h:mm:ss a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {entry.actor ? (
                          <>
                            <span className="text-sm text-slate-700">
                              {entry.actor.firstName} {entry.actor.lastName}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'border text-[10px] h-4',
                                ROLE_COLORS[entry.actor.role] ?? 'bg-slate-100'
                              )}
                            >
                              {entry.actor.role}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400 italic">System</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isOpen && hasDetails && (
                    <div className="px-12 pb-3 space-y-2 bg-slate-50/50">
                      {entry.before && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">Before</div>
                          <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 overflow-x-auto text-slate-700">
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.after && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">After</div>
                          <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded p-2 overflow-x-auto text-slate-700">
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {data?.meta && data.meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {data.meta.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
