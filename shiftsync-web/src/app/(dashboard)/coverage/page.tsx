'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowRight, Clock, Loader2, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  useMyRequests,
  useOpenShifts,
  usePendingApprovals,
  useRespondToSwap,
  useManagerDecision,
  usePickupShift,
  useCancelRequest,
} from '@/hooks/useCoverage'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-sky-100 text-sky-800 border-sky-200',
  ACCEPTED: 'bg-teal-100 text-teal-800 border-teal-200',
  MANAGER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function CoveragePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Coverage Requests</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Manage shift swaps, drops, and coverage approvals
        </p>
      </div>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
          <TabsTrigger value="open">Open Shifts</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="pending">Pending Approvals</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine">
          <MyRequestsTab userId={user?.id} />
        </TabsContent>

        <TabsContent value="open">
          <OpenShiftsTab />
        </TabsContent>

        {isManagerOrAdmin && (
          <TabsContent value="pending">
            <PendingApprovalsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function MyRequestsTab({ userId }: { userId?: string }) {
  const { data, isLoading } = useMyRequests()
  const respond = useRespondToSwap()
  const cancel = useCancelRequest()

  if (isLoading) return <LoadingCard />

  const requests = data ?? []
  if (requests.length === 0) return <EmptyState message="No swap or drop requests yet" />

  return (
    <div className="space-y-2">
      {requests.map((r: any) => {
        const isRequester = r.requesterId === userId
        const isTarget = r.targetId === userId
        const canCancel = isRequester && ['PENDING', 'ACCEPTED', 'MANAGER_REVIEW'].includes(r.status)
        const canRespond = isTarget && r.status === 'PENDING' && r.type === 'SWAP'

        return (
          <Card key={r.id} className="border-slate-200 hover:border-slate-300 transition-colors">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'border',
                    r.type === 'SWAP'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {r.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-900">
                      {r.requester.firstName} {r.requester.lastName[0]}.
                    </span>
                    {r.target && (
                      <>
                        <ArrowRight className="size-3.5 text-slate-400" />
                        <span className="text-slate-700">
                          {r.target.firstName} {r.target.lastName[0]}.
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(r.shift.startTime), 'EEE MMM d')} · {r.shift.location.name}
                    {r.reason && <span className="ml-2">· "{r.reason}"</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={cn('border text-xs', STATUS_COLOR[r.status])}>
                  {r.status.replace('_', ' ')}
                </Badge>

                {canRespond && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        respond.mutate(
                          { id: r.id, response: 'ACCEPTED' },
                          { onSuccess: () => toast.success('Swap accepted, awaiting manager') }
                        )
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 h-8"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        respond.mutate(
                          { id: r.id, response: 'REJECTED' },
                          { onSuccess: () => toast.success('Swap declined') }
                        )
                      }
                      className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Decline
                    </Button>
                  </>
                )}

                {canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      cancel.mutate(r.id, { onSuccess: () => toast.success('Request cancelled') })
                    }
                    className="h-8 border-slate-200"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function OpenShiftsTab() {
  const { data, isLoading } = useOpenShifts()
  const pickup = usePickupShift()

  if (isLoading) return <LoadingCard />

  const shifts = data ?? []
  if (shifts.length === 0)
    return <EmptyState message="No open shifts matching your skills right now" />

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {shifts.map((r: any) => {
        const expiresAt = new Date(r.expiresAt)
        const hoursLeft = (expiresAt.getTime() - Date.now()) / 3600000
        return (
          <Card key={r.id} className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {format(new Date(r.shift.startTime), 'EEEE, MMM d')}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mt-0.5">
                    {format(new Date(r.shift.startTime), 'h:mm a')} –{' '}
                    {format(new Date(r.shift.endTime), 'h:mm a')}
                  </div>
                </div>
                <Badge className="bg-violet-100 text-violet-700 border-0">
                  {r.shift.requiredSkill.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="size-3.5" />
                {r.shift.location.name}
              </div>

              <div className="text-xs text-slate-500">
                Offered by {r.requester.firstName} {r.requester.lastName[0]}.
              </div>

              <div
                className={cn(
                  'text-xs flex items-center gap-1.5',
                  hoursLeft < 4
                    ? 'text-red-700 font-medium'
                    : hoursLeft < 12
                    ? 'text-amber-700'
                    : 'text-slate-500'
                )}
              >
                <Clock className="size-3" />
                Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
              </div>

              <Button
                onClick={() =>
                  pickup.mutate(r.shiftId, {
                    onSuccess: () => toast.success('Pickup request sent for manager approval'),
                    onError: (e: any) =>
                      toast.error(e.response?.data?.message ?? 'Cannot pick up this shift'),
                  })
                }
                disabled={pickup.isPending}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Pick Up Shift
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function PendingApprovalsTab() {
  const { data, isLoading } = usePendingApprovals()
  const decide = useManagerDecision()

  if (isLoading) return <LoadingCard />

  const approvals = data ?? []
  if (approvals.length === 0)
    return <EmptyState message="✓ No requests awaiting approval — you're caught up" />

  return (
    <div className="space-y-3">
      {approvals.map((r: any) => (
        <Card key={r.id} className="border-l-4 border-l-violet-500 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'border',
                      r.type === 'SWAP'
                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}
                  >
                    {r.type}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs bg-slate-200">
                      {r.requester.firstName[0]}
                      {r.requester.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-900">
                    {r.requester.firstName} {r.requester.lastName}
                  </span>
                  {r.target && (
                    <>
                      <ArrowRight className="size-3.5 text-slate-400" />
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs bg-slate-200">
                          {r.target.firstName[0]}
                          {r.target.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-900">
                        {r.target.firstName} {r.target.lastName}
                      </span>
                    </>
                  )}
                </div>

                <div className="text-sm text-slate-700">
                  {format(new Date(r.shift.startTime), 'EEE MMM d, h:mm a')} –{' '}
                  {format(new Date(r.shift.endTime), 'h:mm a')} · {r.shift.location.name} ·{' '}
                  {r.shift.requiredSkill.replace('_', ' ')}
                </div>

                {r.reason && <p className="text-xs text-slate-500 mt-1.5 italic">"{r.reason}"</p>}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() =>
                    decide.mutate(
                      { id: r.id, decision: 'APPROVED' },
                      { onSuccess: () => toast.success('Approved') }
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    decide.mutate(
                      { id: r.id, decision: 'REJECTED' },
                      { onSuccess: () => toast.success('Rejected') }
                    )
                  }
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingCard() {
  return (
    <Card className="p-12 text-center text-slate-500 border-slate-200">
      <Loader2 className="size-5 animate-spin mx-auto mb-2" />
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-12 text-center text-slate-500 border-slate-200">
      <p className="text-sm">{message}</p>
    </Card>
  )
}
