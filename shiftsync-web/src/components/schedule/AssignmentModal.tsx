'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { CalendarDays, Loader2, MapPin, Search, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ViolationBanner, type ConstraintResult } from '@/components/ViolationBanner'
import { useConstraintPreview, useAssignStaff } from '@/hooks/useSchedule'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SKILL_BADGE: Record<string, string> = {
  BARTENDER: 'bg-violet-100 text-violet-800',
  SERVER: 'bg-fuchsia-100 text-fuchsia-800',
  COOK: 'bg-orange-100 text-orange-800',
  HOST: 'bg-cyan-100 text-cyan-800',
  LINE_COOK: 'bg-red-100 text-red-800',
  BARBACK: 'bg-slate-100 text-slate-700',
}

interface ShiftSummary {
  id: string
  locationId: string
  locationName: string
  locationTimezone: string
  startTime: string
  endTime: string
  requiredSkill: string
  headcount: number
  assignedCount: number
  status: 'DRAFT' | 'PUBLISHED'
  isPremium: boolean
}

interface AssignmentModalProps {
  open: boolean
  onClose: () => void
  shift: ShiftSummary | null
}

interface StaffCandidate {
  id: string
  firstName: string
  lastName: string
  email: string
  skills: { skill: string }[]
  desiredWeeklyHours?: number | null
  locationLinks?: { type: string; location?: { id: string } }[]
}

export function AssignmentModal({ open, onClose, shift }: AssignmentModalProps) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [staff, setStaff] = useState<StaffCandidate[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const preview = useConstraintPreview()
  const assign = useAssignStaff()

  // Read result directly from mutation state — no separate useState avoids stale closure
  const constraintResult = preview.isSuccess ? (preview.data as ConstraintResult) : null

  // Fetch staff list when modal opens
  useEffect(() => {
    if (!open || !shift) return
    setStaffLoading(true)
    api
      .get('/users', { params: { locationId: shift.locationId } })
      .then((r) => setStaff(r.data.data ?? r.data ?? []))
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false))
  }, [open, shift?.locationId])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedUserId(null)
      setOverrideReason('')
      setSearch('')
      preview.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Run constraint preview when staff selection changes
  useEffect(() => {
    if (!selectedUserId || !shift) {
      preview.reset()
      return
    }
    preview.mutate({ shiftId: shift.id, userId: selectedUserId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, shift?.id])

  if (!shift) return null

  // Filter staff: by skill match + cert + search query
  const filteredStaff = staff
    .filter((s) => s.skills?.some((sk) => sk.skill === shift.requiredSkill))
    .filter((s) =>
      search
        ? `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
        : true
    )

  const selected = staff.find((s) => s.id === selectedUserId) ?? null
  const canConfirm =
    !!constraintResult &&
    (constraintResult.valid ||
      // Allow override if 7th day with reason
      (constraintResult.violations.some((v) => v.rule === 'SEVENTH_DAY_BLOCK') &&
        overrideReason.trim().length > 0))

  function handleConfirm() {
    if (!selectedUserId || !shift) return
    assign.mutate(
      {
        shiftId: shift.id,
        userId: selectedUserId,
        ...(overrideReason && { overrideReason }),
      },
      {
        onSuccess: () => {
          toast.success(`${selected?.firstName} assigned to shift`)
          onClose()
        },
        onError: (e: any) => {
          const msg = e.response?.data?.message
          toast.error(typeof msg === 'string' ? msg : 'Failed to assign — see violations above')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl tracking-tight text-slate-900">Assign Staff to Shift</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Select a qualified teammate, review rule checks, then confirm assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 px-6 pb-6 overflow-y-auto">
          {/* Left panel — Shift details */}
          <aside className="md:col-span-2 space-y-4 rounded-lg bg-slate-50 p-5 border border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <MapPin className="size-3" />
                Location
              </div>
              <p className="font-medium text-slate-900 mt-0.5">{shift.locationName}</p>
              <p className="text-xs text-slate-500">{shift.locationTimezone}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <CalendarDays className="size-3" />
                Date & Time
              </div>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {formatInTimeZone(new Date(shift.startTime), shift.locationTimezone, 'EEE, MMM d')}
              </p>
              <p className="text-sm text-slate-700">
                {formatInTimeZone(new Date(shift.startTime), shift.locationTimezone, 'h:mm a')} –{' '}
                {formatInTimeZone(new Date(shift.endTime), shift.locationTimezone, 'h:mm a zzz')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <Users className="size-3" />
                Required Skill
              </div>
              <Badge className={cn('mt-1 border-0', SKILL_BADGE[shift.requiredSkill])}>
                {shift.requiredSkill.replace('_', ' ')}
              </Badge>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Headcount</div>
              <p className="text-sm text-slate-900 mt-0.5">
                {shift.assignedCount} of {shift.headcount} filled
              </p>
            </div>

            {shift.isPremium && (
              <Badge className="bg-violet-100 text-violet-800 border-0">★ Premium Shift</Badge>
            )}
          </aside>

          {/* Right panel — Staff selection + violation banner */}
          <div className="md:col-span-3 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Select staff member</label>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing staff with {shift.requiredSkill.replace('_', ' ').toLowerCase()} skill
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search staff…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <ScrollArea className="h-60 rounded-md border border-slate-200 bg-white">
              <div className="p-1">
                {staffLoading ? (
                  <div className="p-4 text-center text-sm text-slate-500">Loading…</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No qualified staff found
                  </div>
                ) : (
                  filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedUserId(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                        selectedUserId === s.id
                          ? 'bg-violet-50 border border-violet-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      )}
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-slate-200 text-slate-700">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {s.skills?.slice(0, 3).map((sk, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] px-1 h-4 border-slate-200"
                            >
                              {sk.skill.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Constraint validation result */}
            {preview.isPending && <ConstraintLoadingMessage />}

            {preview.isError && !preview.isPending && (
              <div className="flex items-center gap-2 text-sm text-amber-700 p-3 bg-amber-50 border border-amber-100 rounded-md">
                <span>⚠</span>
                {(preview.error as any)?.code === 'ECONNABORTED'
                  ? 'Constraint check timed out. Database may be slow — try again or assign manually.'
                  : 'Could not verify constraints. Check your connection and try again.'}
              </div>
            )}

            {constraintResult && !preview.isPending && (
              <ViolationBanner
                result={constraintResult}
                onSelectSuggestion={(uid) => setSelectedUserId(uid)}
                overrideReason={overrideReason}
                onOverrideChange={setOverrideReason}
              />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="outline" onClick={onClose} disabled={assign.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || assign.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {assign.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Assigning…
                  </>
                ) : !selectedUserId ? (
                  'Select a staff member'
                ) : !constraintResult?.valid && !overrideReason ? (
                  'Cannot assign'
                ) : (
                  'Confirm Assignment'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const LOADING_MESSAGES = [
  'Checking double bookings…',
  'Verifying skills and certifications…',
  'Checking rest period requirements…',
  'Reviewing weekly hour limits…',
  'Scanning consecutive day count…',
  'Cross-referencing availability windows…',
  'Computing timezone-aware schedule…',
  'Finding qualified alternatives…',
]

function ConstraintLoadingMessage() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-violet-50/50 border border-violet-100 rounded-md">
      <Loader2 className="size-4 animate-spin text-violet-500 shrink-0" />
      <span className="text-violet-700 font-medium transition-all duration-300">{LOADING_MESSAGES[idx]}</span>
    </div>
  )
}
