'use client'

import { useState, useEffect, useMemo } from 'react'
import { addDays, format, startOfWeek, subDays } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WeekGrid, type WeekShift } from '@/components/schedule/WeekGrid'
import { AssignmentModal } from '@/components/schedule/AssignmentModal'
import { useCreateShift, useWeekSchedule, usePublishWeek } from '@/hooks/useSchedule'
import { getStoredUser } from '@/lib/auth'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  city: string
  timezone: string
}

const SKILL_OPTIONS = [
  'BARTENDER',
  'SERVER',
  'COOK',
  'HOST',
  'LINE_COOK',
  'BARBACK',
] as const

type CreateShiftForm = {
  startTime: string
  endTime: string
  requiredSkill: string
  headcount: string
  notes: string
}

export default function SchedulePage() {
  const user = getStoredUser()
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [locationId, setLocationId] = useState<string>('')
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedShift, setSelectedShift] = useState<WeekShift | null>(null)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const schedule = useWeekSchedule(weekStartStr, locationId || undefined)
  const publish = usePublishWeek()
  const createShift = useCreateShift()
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [createForm, setCreateForm] = useState<CreateShiftForm>({
    startTime: '',
    endTime: '',
    requiredSkill: 'SERVER',
    headcount: '1',
    notes: '',
  })

  // Load locations
  useEffect(() => {
    api
      .get('/locations')
      .then((r) => {
        const list = r.data.data ?? r.data ?? []
        setLocations(list)
        if (!locationId && list.length > 0) setLocationId(list[0].id)
      })
      .catch(() => toast.error('Failed to load locations. Please refresh the page.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shifts: WeekShift[] = useMemo(() => {
    return (schedule.data ?? []).map((s: any) => ({
      id: s.id,
      locationId: s.locationId,
      locationName: s.location?.name ?? 'Unknown',
      locationTimezone: s.location?.timezone ?? 'UTC',
      startTime: s.startTime,
      endTime: s.endTime,
      requiredSkill: s.requiredSkill,
      headcount: s.headcount,
      status: s.status,
      isPremium: s.isPremium,
      assignments: s.assignments ?? [],
      hasPendingSwap: (s._count?.swapRequests ?? 0) > 0,
    }))
  }, [schedule.data])

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  )

  const draftShifts = shifts.filter((s) => s.status === 'DRAFT').length

  function handlePublish() {
    if (!locationId) return toast.error('Select a location first')
    publish.mutate(
      { weekStart: weekStartStr, locationId },
      {
        onSuccess: (data: any) => {
          const count = data.data?.published ?? data.published ?? 0
          toast.success(`Published ${count} shift${count === 1 ? '' : 's'}`)
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to publish'),
      }
    )
  }

  function handleOpenCreateShift(day: Date) {
    if (!locationId) {
      toast.error('Select a location first')
      return
    }

    const datePart = format(day, 'yyyy-MM-dd')
    setCreateDate(day)
    setCreateErrors({})
    setCreateForm({
      startTime: `${datePart}T09:00`,
      endTime: `${datePart}T17:00`,
      requiredSkill: 'SERVER',
      headcount: '1',
      notes: '',
    })
    setIsCreateOpen(true)
  }

  function validateCreateForm() {
    const nextErrors: Record<string, string> = {}
    const headcount = Number(createForm.headcount)

    if (!locationId) nextErrors.locationId = 'Location is required'
    if (!createForm.startTime) nextErrors.startTime = 'Start time is required'
    if (!createForm.endTime) nextErrors.endTime = 'End time is required'
    if (!createForm.requiredSkill) nextErrors.requiredSkill = 'Skill is required'
    if (!Number.isInteger(headcount) || headcount < 1 || headcount > 20) {
      nextErrors.headcount = 'Headcount must be an integer between 1 and 20'
    }

    if (createForm.startTime && createForm.endTime) {
      const startTs = new Date(createForm.startTime).getTime()
      const endTs = new Date(createForm.endTime).getTime()
      if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
        nextErrors.endTime = 'Please enter valid date and time values'
      } else if (endTs <= startTs) {
        nextErrors.endTime = 'End time must be after start time'
      }
    }

    setCreateErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleCreateShift() {
    if (!selectedLocation || !validateCreateForm()) return

    createShift.mutate(
      {
        locationId,
        startTime: fromZonedTime(createForm.startTime, selectedLocation.timezone).toISOString(),
        endTime: fromZonedTime(createForm.endTime, selectedLocation.timezone).toISOString(),
        requiredSkill: createForm.requiredSkill,
        headcount: Number(createForm.headcount),
        notes: createForm.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Shift created')
          setIsCreateOpen(false)
        },
        onError: (e: any) => {
          toast.error(e.response?.data?.message ?? 'Failed to create shift')
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Weekly Schedule</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
        </div>

        {isManagerOrAdmin && draftShifts > 0 && (
          <Button
            onClick={handlePublish}
            disabled={publish.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {publish.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Publish Week ({draftShifts} draft)
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <Card className="border-slate-200">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setWeekStart((d) => subDays(d, 7))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {schedule.isFetching && (
              <Loader2 className="size-4 animate-spin text-slate-400" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip label="Total Shifts" value={shifts.length} />
        <StatChip
          label="Published"
          value={shifts.filter((s) => s.status === 'PUBLISHED').length}
          tone="emerald"
        />
        <StatChip label="Draft" value={draftShifts} tone="amber" />
        <StatChip
          label="Premium"
          value={shifts.filter((s) => s.isPremium).length}
          tone="violet"
        />
      </div>

      {/* Week grid */}
      {schedule.isLoading ? (
        <Card className="p-12 text-center text-slate-500">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Loading schedule…
        </Card>
      ) : (
        <WeekGrid
          weekStart={weekStart}
          shifts={shifts}
          canCreate={isManagerOrAdmin}
          onShiftClick={setSelectedShift}
          onCreateShift={handleOpenCreateShift}
        />
      )}

      {/* Assignment modal */}
      <AssignmentModal
        open={!!selectedShift}
        canAssign={isManagerOrAdmin}
        onClose={() => setSelectedShift(null)}
        shift={
          selectedShift && {
            id: selectedShift.id,
            locationId: selectedShift.locationId,
            locationName: selectedShift.locationName,
            locationTimezone: selectedShift.locationTimezone,
            startTime: selectedShift.startTime,
            endTime: selectedShift.endTime,
            requiredSkill: selectedShift.requiredSkill,
            headcount: selectedShift.headcount,
            assignedCount: selectedShift.assignments.filter((a) => a.status !== 'CANCELLED').length,
            status: selectedShift.status,
            isPremium: selectedShift.isPremium,
          }
        }
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Shift</DialogTitle>
            <DialogDescription>
              {createDate ? `${format(createDate, 'EEE, MMM d')} at ${selectedLocation?.name ?? 'selected location'}` : 'Add a new shift'}
              {selectedLocation?.timezone ? ` (${selectedLocation.timezone})` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="create-start-time">Start time</Label>
              <Input
                id="create-start-time"
                type="datetime-local"
                value={createForm.startTime}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, startTime: e.target.value }))}
              />
              {createErrors.startTime && <p className="text-xs text-red-600">{createErrors.startTime}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-end-time">End time</Label>
              <Input
                id="create-end-time"
                type="datetime-local"
                value={createForm.endTime}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, endTime: e.target.value }))}
              />
              {createErrors.endTime && <p className="text-xs text-red-600">{createErrors.endTime}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="create-required-skill">Required skill</Label>
                <Select
                  value={createForm.requiredSkill}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, requiredSkill: value }))}
                >
                  <SelectTrigger id="create-required-skill">
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_OPTIONS.map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.requiredSkill && <p className="text-xs text-red-600">{createErrors.requiredSkill}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-headcount">Headcount</Label>
                <Input
                  id="create-headcount"
                  type="number"
                  min={1}
                  max={20}
                  value={createForm.headcount}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, headcount: e.target.value }))}
                />
                {createErrors.headcount && <p className="text-xs text-red-600">{createErrors.headcount}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes (optional)</Label>
              <Textarea
                id="create-notes"
                placeholder="Add shift notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createShift.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateShift} disabled={createShift.isPending} className="bg-violet-600 hover:bg-violet-700">
              {createShift.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Shift'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatChip({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'emerald' | 'amber' | 'violet'
}) {
  const colors = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    violet: 'text-violet-700',
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={`text-2xl font-bold mt-0.5 ${colors[tone]}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
