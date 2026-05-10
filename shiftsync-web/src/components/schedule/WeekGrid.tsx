'use client'

import { useMemo } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { Plus, Star, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SKILL_BAR: Record<string, string> = {
  BARTENDER: 'bg-violet-500',
  SERVER: 'bg-fuchsia-500',
  COOK: 'bg-orange-500',
  HOST: 'bg-cyan-500',
  LINE_COOK: 'bg-red-500',
  BARBACK: 'bg-slate-500',
}

const SKILL_TEXT: Record<string, string> = {
  BARTENDER: 'text-violet-700',
  SERVER: 'text-fuchsia-700',
  COOK: 'text-orange-700',
  HOST: 'text-cyan-700',
  LINE_COOK: 'text-red-700',
  BARBACK: 'text-slate-700',
}

export interface WeekShift {
  id: string
  locationId: string
  locationName: string
  locationTimezone: string
  startTime: string
  endTime: string
  requiredSkill: string
  headcount: number
  status: 'DRAFT' | 'PUBLISHED'
  isPremium: boolean
  assignments: Array<{
    userId?: string
    user?: { id: string; firstName: string; lastName: string }
    status: string
  }>
  hasPendingSwap?: boolean
}

interface WeekGridProps {
  weekStart: Date
  shifts: WeekShift[]
  canCreate: boolean
  onShiftClick: (shift: WeekShift) => void
  onCreateShift?: (date: Date) => void
}

export function WeekGrid({ weekStart, shifts, canCreate, onShiftClick, onCreateShift }: WeekGridProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const shiftsByDay = useMemo(() => {
    const map: Record<string, WeekShift[]> = {}
    days.forEach((d) => (map[format(d, 'yyyy-MM-dd')] = []))

    shifts.forEach((shift) => {
      const localDate = formatInTimeZone(new Date(shift.startTime), shift.locationTimezone, 'yyyy-MM-dd')
      if (map[localDate]) map[localDate].push(shift)
    })

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    })

    return map
  }, [days, shifts])

  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <div className="grid grid-cols-7 divide-x divide-slate-200">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayShifts = shiftsByDay[dateKey] ?? []
          const isToday = isSameDay(day, new Date())
          const isWeekend = day.getDay() === 0 || day.getDay() === 6

          return (
            <div
              key={dateKey}
              className={cn(
                'min-h-100 flex flex-col',
                isWeekend && 'bg-slate-50/50'
              )}
            >
              {/* Day header */}
              <div className="border-b border-slate-200 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn('text-2xl font-semibold', isToday ? 'text-violet-600' : 'text-slate-900')}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  {isToday && (
                    <Badge className="bg-violet-100 text-violet-700 text-[10px] border-0 h-5">Today</Badge>
                  )}
                </div>
              </div>

              {/* Shifts list */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {dayShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} onClick={() => onShiftClick(shift)} />
                ))}

                {canCreate && onCreateShift && (
                  <button
                    onClick={() => onCreateShift(day)}
                    className="w-full border border-dashed border-slate-300 rounded-md p-2 text-xs text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="size-3" />
                    Add shift
                  </button>
                )}

                {dayShifts.length === 0 && !canCreate && (
                  <p className="text-xs text-slate-400 text-center pt-4">No shifts</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ShiftCard({ shift, onClick }: { shift: WeekShift; onClick: () => void }) {
  const skillBar = SKILL_BAR[shift.requiredSkill] ?? 'bg-slate-400'
  const skillText = SKILL_TEXT[shift.requiredSkill] ?? 'text-slate-700'

  const startStr = formatInTimeZone(new Date(shift.startTime), shift.locationTimezone, 'h:mm a')
  const endStr = formatInTimeZone(new Date(shift.endTime), shift.locationTimezone, 'h:mm a')

  const activeAssignments = shift.assignments.filter((a) => a.status !== 'CANCELLED')
  const filled = activeAssignments.length
  const isFull = filled >= shift.headcount
  const isUnderstaffed = filled < shift.headcount
  const isUnstaffed = filled === 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border bg-white shadow-sm hover:shadow-md transition-all relative pl-2.5 pr-2 py-2 group',
        shift.status === 'DRAFT'
          ? 'border-dashed border-slate-300'
          : 'border-slate-200 hover:border-slate-300',
        isUnstaffed && 'border-red-200 bg-red-50/50'
      )}
    >
      {/* Skill color bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', skillBar)} />

      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-900">
            {startStr} – {endStr}
          </div>
          <div className={cn('text-[10px] font-medium mt-0.5', skillText)}>
            {shift.requiredSkill.replace('_', ' ')}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {shift.isPremium && <Star className="size-3 fill-violet-500 text-violet-500" />}
          {shift.hasPendingSwap && <AlertCircle className="size-3 text-amber-500" />}
        </div>
      </div>

      {/* Assignments */}
      <div className="mt-1.5 flex items-center gap-1">
        <div className="flex -space-x-1">
          {activeAssignments.slice(0, 3).map((a, i) => {
            const user = a.user ?? { firstName: '?', lastName: '?' }
            return (
              <div
                key={i}
                className="size-5 rounded-full bg-slate-200 border border-white text-[9px] font-medium text-slate-700 flex items-center justify-center"
                title={`${user.firstName} ${user.lastName}`}
              >
                {user.firstName[0]}
              </div>
            )
          })}
          {activeAssignments.length > 3 && (
            <div className="size-5 rounded-full bg-slate-100 border border-white text-[9px] font-medium text-slate-600 flex items-center justify-center">
              +{activeAssignments.length - 3}
            </div>
          )}
        </div>
        <Badge
          className={cn(
            'border-0 text-[9px] px-1 h-4 ml-auto',
            isFull
              ? 'bg-emerald-100 text-emerald-700'
              : isUnstaffed
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          )}
        >
          {filled}/{shift.headcount}
        </Badge>
      </div>
    </button>
  )
}
