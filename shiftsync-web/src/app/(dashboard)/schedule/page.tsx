'use client'

import { useState, useEffect, useMemo } from 'react'
import { addDays, format, startOfWeek, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WeekGrid, type WeekShift } from '@/components/schedule/WeekGrid'
import { AssignmentModal } from '@/components/schedule/AssignmentModal'
import { useWeekSchedule, usePublishWeek } from '@/hooks/useSchedule'
import { getStoredUser } from '@/lib/auth'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  city: string
  timezone: string
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
        />
      )}

      {/* Assignment modal */}
      <AssignmentModal
        open={!!selectedShift}
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
