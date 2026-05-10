"use client"

import { Clock, Plus, Star, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Skill types with their color configurations
const SKILL_COLORS = {
  BARTENDER: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  SERVER: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  COOK: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
  HOST: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    badge: "bg-teal-100 text-teal-700",
  },
  LINE_COOK: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
} as const

type SkillType = keyof typeof SKILL_COLORS

type ShiftStatus = "DRAFT" | "PUBLISHED"

interface Shift {
  id: string
  startTime: string
  endTime: string
  skill: SkillType
  status: ShiftStatus
  filledCount: number
  requiredCount: number
  isPremium?: boolean
}

interface DaySchedule {
  day: string
  date: string
  shifts: Shift[]
  hasUnassigned?: boolean
}

// Sample data for the week
const weekSchedule: DaySchedule[] = [
  {
    day: "Mon",
    date: "Jan 6",
    shifts: [
      { id: "1", startTime: "11:00 AM", endTime: "4:00 PM", skill: "HOST", status: "PUBLISHED", filledCount: 1, requiredCount: 1 },
      { id: "2", startTime: "4:00 PM", endTime: "10:00 PM", skill: "SERVER", status: "PUBLISHED", filledCount: 3, requiredCount: 3 },
      { id: "3", startTime: "5:00 PM", endTime: "11:00 PM", skill: "BARTENDER", status: "DRAFT", filledCount: 1, requiredCount: 2 },
    ],
    hasUnassigned: true,
  },
  {
    day: "Tue",
    date: "Jan 7",
    shifts: [
      { id: "4", startTime: "10:00 AM", endTime: "3:00 PM", skill: "COOK", status: "PUBLISHED", filledCount: 2, requiredCount: 2 },
      { id: "5", startTime: "4:00 PM", endTime: "10:00 PM", skill: "SERVER", status: "PUBLISHED", filledCount: 4, requiredCount: 4 },
      { id: "6", startTime: "5:00 PM", endTime: "12:00 AM", skill: "LINE_COOK", status: "PUBLISHED", filledCount: 2, requiredCount: 2 },
    ],
  },
  {
    day: "Wed",
    date: "Jan 8",
    shifts: [
      { id: "7", startTime: "11:00 AM", endTime: "4:00 PM", skill: "HOST", status: "PUBLISHED", filledCount: 1, requiredCount: 1 },
      { id: "8", startTime: "3:00 PM", endTime: "9:00 PM", skill: "BARTENDER", status: "DRAFT", filledCount: 0, requiredCount: 2 },
    ],
    hasUnassigned: true,
  },
  {
    day: "Thu",
    date: "Jan 9",
    shifts: [
      { id: "9", startTime: "10:00 AM", endTime: "4:00 PM", skill: "COOK", status: "PUBLISHED", filledCount: 2, requiredCount: 2 },
      { id: "10", startTime: "4:00 PM", endTime: "11:00 PM", skill: "SERVER", status: "PUBLISHED", filledCount: 3, requiredCount: 4 },
      { id: "11", startTime: "5:00 PM", endTime: "11:00 PM", skill: "BARTENDER", status: "PUBLISHED", filledCount: 2, requiredCount: 2 },
    ],
  },
  {
    day: "Fri",
    date: "Jan 10",
    shifts: [
      { id: "12", startTime: "11:00 AM", endTime: "4:00 PM", skill: "HOST", status: "PUBLISHED", filledCount: 2, requiredCount: 2 },
      { id: "13", startTime: "5:00 PM", endTime: "12:00 AM", skill: "SERVER", status: "PUBLISHED", filledCount: 5, requiredCount: 5, isPremium: true },
      { id: "14", startTime: "6:00 PM", endTime: "2:00 AM", skill: "BARTENDER", status: "PUBLISHED", filledCount: 3, requiredCount: 3, isPremium: true },
      { id: "15", startTime: "4:00 PM", endTime: "12:00 AM", skill: "LINE_COOK", status: "DRAFT", filledCount: 2, requiredCount: 3, isPremium: true },
    ],
  },
  {
    day: "Sat",
    date: "Jan 11",
    shifts: [
      { id: "16", startTime: "10:00 AM", endTime: "4:00 PM", skill: "COOK", status: "PUBLISHED", filledCount: 3, requiredCount: 3 },
      { id: "17", startTime: "5:00 PM", endTime: "1:00 AM", skill: "SERVER", status: "PUBLISHED", filledCount: 6, requiredCount: 6, isPremium: true },
      { id: "18", startTime: "6:00 PM", endTime: "2:00 AM", skill: "BARTENDER", status: "PUBLISHED", filledCount: 4, requiredCount: 4, isPremium: true },
      { id: "19", startTime: "5:00 PM", endTime: "1:00 AM", skill: "LINE_COOK", status: "DRAFT", filledCount: 2, requiredCount: 4, isPremium: true },
    ],
    hasUnassigned: true,
  },
  {
    day: "Sun",
    date: "Jan 12",
    shifts: [
      { id: "20", startTime: "10:00 AM", endTime: "3:00 PM", skill: "HOST", status: "PUBLISHED", filledCount: 1, requiredCount: 1 },
      { id: "21", startTime: "11:00 AM", endTime: "6:00 PM", skill: "SERVER", status: "PUBLISHED", filledCount: 3, requiredCount: 3 },
      { id: "22", startTime: "12:00 PM", endTime: "8:00 PM", skill: "COOK", status: "DRAFT", filledCount: 1, requiredCount: 2 },
    ],
    hasUnassigned: true,
  },
]

function ShiftCard({ shift }: { shift: Shift }) {
  const colors = SKILL_COLORS[shift.skill]
  const isFilled = shift.filledCount >= shift.requiredCount
  const statusBorder = shift.status === "PUBLISHED" ? "border-l-emerald-500" : "border-l-slate-400"

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-l-4 p-3 transition-all hover:shadow-md cursor-pointer",
        colors.bg,
        colors.border,
        statusBorder
      )}
    >
      {shift.isPremium && (
        <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-purple-500 shadow-sm">
          <Star className="size-3 fill-white text-white" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className={cn("size-3.5", colors.text)} />
          <span className={cn("text-xs font-medium", colors.text)}>
            {shift.startTime} - {shift.endTime}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Badge
          className={cn(
            "border-0 text-[10px] font-semibold uppercase tracking-wide",
            colors.badge
          )}
        >
          {shift.skill.replace("_", " ")}
        </Badge>

        <div className="flex items-center gap-1">
          <Users className={cn("size-3", isFilled ? "text-emerald-600" : "text-amber-600")} />
          <span
            className={cn(
              "text-xs font-semibold",
              isFilled ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {shift.filledCount}/{shift.requiredCount}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
            shift.status === "PUBLISHED"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          )}
        >
          {shift.status}
        </span>
      </div>
    </div>
  )
}

function UnassignedSlot() {
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600"
    >
      <Plus className="size-4" />
      <span className="text-sm font-medium">Click to assign</span>
    </button>
  )
}

function DayColumn({ daySchedule }: { daySchedule: DaySchedule }) {
  const isWeekend = daySchedule.day === "Sat" || daySchedule.day === "Sun"

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "sticky top-0 z-10 rounded-t-lg border-b px-3 py-3 text-center",
          isWeekend ? "bg-purple-50" : "bg-slate-50"
        )}
      >
        <p className={cn(
          "text-sm font-semibold",
          isWeekend ? "text-purple-700" : "text-slate-700"
        )}>
          {daySchedule.day}
        </p>
        <p className="text-xs text-slate-500">{daySchedule.date}</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-b-lg border-x border-b bg-white p-3">
        {daySchedule.shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}
        {daySchedule.hasUnassigned && <UnassignedSlot />}
      </div>
    </div>
  )
}

export function ScheduleGrid() {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-slate-700">Skills:</span>
        {Object.entries(SKILL_COLORS).map(([skill, colors]) => (
          <div key={skill} className="flex items-center gap-1.5">
            <div className={cn("size-3 rounded", colors.badge.split(" ")[0])} />
            <span className="text-xs text-slate-600">{skill.replace("_", " ")}</span>
          </div>
        ))}

        <div className="mx-2 h-4 w-px bg-slate-200" />

        <span className="text-sm font-medium text-slate-700">Status:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-1 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-1 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600">Draft</span>
        </div>

        <div className="mx-2 h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded-full bg-purple-500">
            <Star className="size-2.5 fill-white text-white" />
          </div>
          <span className="text-xs text-slate-600">Premium Shift</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg">
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {weekSchedule.map((daySchedule) => (
            <DayColumn key={daySchedule.day} daySchedule={daySchedule} />
          ))}
        </div>
      </div>
    </div>
  )
}
