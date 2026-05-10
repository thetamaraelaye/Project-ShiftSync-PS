"use client"

import Link from "next/link"
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  MapPin,
  Star,
  Timer,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SKILL_COLORS, STATUS_COLORS } from "@/lib/constants"
import type { MyShift, SwapRequest, OpenShift } from "@/lib/types"

// Mock data
const mockNextShift: MyShift = {
  id: "1",
  locationName: "Downtown Bar & Grill",
  locationTimezone: "PST",
  startTime: "2025-01-10T18:00:00Z",
  endTime: "2025-01-10T23:00:00Z",
  requiredSkill: "BARTENDER",
  status: "ASSIGNED",
  isPremium: true,
}

const mockWeekShifts: MyShift[] = [
  { id: "1", locationName: "Downtown Bar & Grill", locationTimezone: "PST", startTime: "2025-01-06T16:00:00Z", endTime: "2025-01-06T22:00:00Z", requiredSkill: "BARTENDER", status: "CONFIRMED", isPremium: false },
  { id: "2", locationName: "Downtown Bar & Grill", locationTimezone: "PST", startTime: "2025-01-08T17:00:00Z", endTime: "2025-01-08T23:00:00Z", requiredSkill: "BARTENDER", status: "CONFIRMED", isPremium: false },
  { id: "3", locationName: "Downtown Bar & Grill", locationTimezone: "PST", startTime: "2025-01-10T18:00:00Z", endTime: "2025-01-10T23:00:00Z", requiredSkill: "BARTENDER", status: "ASSIGNED", isPremium: true },
  { id: "4", locationName: "Mission District Tavern", locationTimezone: "PST", startTime: "2025-01-11T17:00:00Z", endTime: "2025-01-12T01:00:00Z", requiredSkill: "BARTENDER", status: "ASSIGNED", isPremium: true },
]

const mockSwapRequests: SwapRequest[] = [
  { id: "1", type: "SWAP", status: "PENDING", shiftDate: "Jan 10", locationName: "Downtown Bar & Grill", targetName: "Sarah Chen" },
  { id: "2", type: "DROP", status: "MANAGER_REVIEW", shiftDate: "Jan 12", locationName: "Mission District Tavern", targetName: null },
]

const mockOpenShifts: OpenShift[] = [
  { id: "1", locationName: "Oakland Waterfront", date: "Jan 9", startTime: "5:00 PM", endTime: "11:00 PM", requiredSkill: "BARTENDER", expiresAt: "2025-01-09T14:00:00Z", requesterName: "Marcus Johnson" },
  { id: "2", locationName: "Berkeley Bistro", date: "Jan 11", startTime: "6:00 PM", endTime: "12:00 AM", requiredSkill: "BARTENDER", expiresAt: "2025-01-11T10:00:00Z", requesterName: "Emily Rodriguez" },
]

interface StaffDashboardProps {
  nextShift?: MyShift | null
  weekShifts?: MyShift[]
  weeklyHours?: number
  desiredWeeklyHours?: number
  myRequests?: SwapRequest[]
  openShifts?: OpenShift[]
  onPickupShift?: (shiftId: string) => void
  onRequestSwap?: (shiftId: string) => void
  loading?: boolean
}

function formatShiftTime(isoTime: string): string {
  const date = new Date(isoTime)
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function formatShiftDate(isoTime: string): string {
  const date = new Date(isoTime)
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

function getHoursRemaining(expiresAt: string): { hours: number; minutes: number; isUrgent: boolean } {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { hours: Math.max(0, hours), minutes: Math.max(0, minutes), isUrgent: hours < 4 }
}

function NextShiftCard({ shift, onRequestSwap }: { shift: MyShift | null; onRequestSwap: (id: string) => void }) {
  if (!shift) {
    return (
      <Card className="border-l-4 border-l-slate-300 border-slate-200 bg-white">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <Calendar className="size-12 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No upcoming shifts scheduled</p>
          <Link href="/schedule" className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
            View schedule
          </Link>
        </CardContent>
      </Card>
    )
  }

  const startTime = formatShiftTime(shift.startTime)
  const endTime = formatShiftTime(shift.endTime)
  const date = formatShiftDate(shift.startTime)
  const duration = Math.round((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60))

  return (
    <Card className="border-l-4 border-l-indigo-500 border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className="border-0 bg-indigo-100 text-indigo-700 text-xs font-semibold">
            NEXT SHIFT
          </Badge>
          {shift.isPremium && (
            <div className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5">
              <Star className="size-3 fill-violet-500 text-violet-500" />
              <span className="text-xs font-medium text-violet-700">Premium</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 text-slate-400" />
          <div>
            <p className="font-semibold text-slate-900">{shift.locationName}</p>
            <p className="text-xs text-slate-500">{shift.locationTimezone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="size-4 text-slate-400" />
          <div>
            <p className="font-medium text-slate-900">{date}</p>
            <p className="text-sm text-slate-600">{startTime} - {endTime}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={cn("border-0 text-xs", SKILL_COLORS[shift.requiredSkill].badge)}>
            {shift.requiredSkill.replace("_", " ")}
          </Badge>
          <span className="text-sm text-slate-500">{duration} hours</span>
        </div>

        <Button variant="outline" className="mt-2 w-full" onClick={() => onRequestSwap(shift.id)}>
          <ArrowLeftRight className="mr-2 size-4" />
          Request Swap
        </Button>
      </CardContent>
    </Card>
  )
}

function WeekViewCard({ shifts }: { shifts: MyShift[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const dateNumbers = [6, 7, 8, 9, 10]

  const shiftsByDay: Record<number, MyShift | null> = {}
  shifts.forEach((shift) => {
    const day = new Date(shift.startTime).getDay()
    // Convert Sunday=0 to Mon=0...
    const dayIndex = day === 0 ? 6 : day - 1
    if (dayIndex < 5) shiftsByDay[dayIndex] = shift
  })

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {days.map((day, idx) => {
            const shift = shiftsByDay[idx]
            return (
              <div key={day} className="text-center">
                <p className="text-xs font-medium text-slate-500">{day}</p>
                <p className="text-sm font-semibold text-slate-900">{dateNumbers[idx]}</p>
                {shift ? (
                  <div className="mt-2">
                    <div className={cn("mx-auto size-2 rounded-full", SKILL_COLORS[shift.requiredSkill].bg.replace("bg-", "bg-"))} style={{ backgroundColor: shift.requiredSkill === "BARTENDER" ? "#818cf8" : "#a78bfa" }} />
                    <p className="mt-1 text-[10px] text-slate-600">
                      {formatShiftTime(shift.startTime).replace(" ", "")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-300">—</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-600">{shifts.length} shifts this week</p>
          <Link href="/schedule" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View full schedule
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function HoursCard({ weeklyHours, desiredHours }: { weeklyHours: number; desiredHours: number }) {
  const percentage = (weeklyHours / desiredHours) * 100
  const status = weeklyHours >= 40 ? "overtime" : weeklyHours >= 35 ? "warning" : "normal"
  const progressColor = {
    normal: "bg-emerald-500",
    warning: "bg-amber-500",
    overtime: "bg-red-500",
  }[status]

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-900">{weeklyHours}</p>
          <p className="text-sm text-slate-500">hours this week</p>
        </div>

        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-slate-500">of {desiredHours}h desired</p>
        </div>

        {status === "overtime" && (
          <p className="mt-3 text-center text-xs font-medium text-red-600">
            You are approaching overtime limits
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SwapRequestsList({ requests }: { requests: SwapRequest[] }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Swap Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No active swap requests</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Badge className={cn("border-0 text-xs", req.type === "SWAP" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700")}>
                    {req.type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{req.shiftDate}</p>
                    <p className="text-xs text-slate-500">
                      {req.targetName ? `with ${req.targetName}` : "Open drop"}
                    </p>
                  </div>
                </div>
                <Badge className={cn("border text-xs", STATUS_COLORS[req.status].color)}>
                  {STATUS_COLORS[req.status].label}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OpenShiftsList({ shifts, onPickup }: { shifts: OpenShift[]; onPickup: (id: string) => void }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Open Shifts Available</CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No open shifts matching your skills</p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const { hours, minutes, isUrgent } = getHoursRemaining(shift.expiresAt)
              return (
                <div key={shift.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{shift.locationName}</p>
                      <p className="text-sm text-slate-600">{shift.date} • {shift.startTime} - {shift.endTime}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={cn("border-0 text-xs", SKILL_COLORS[shift.requiredSkill].badge)}>
                          {shift.requiredSkill.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-slate-500">from {shift.requesterName}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onPickup(shift.id)} className="bg-indigo-500 hover:bg-indigo-600">
                      Pick Up
                    </Button>
                  </div>
                  <div className={cn("mt-2 flex items-center gap-1 text-xs", isUrgent ? "text-amber-600" : "text-slate-500")}>
                    <Timer className="size-3" />
                    Expires in {hours}h {minutes}m
                    {isUrgent && <span className="font-medium">(Urgent)</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StaffDashboard({
  nextShift = mockNextShift,
  weekShifts = mockWeekShifts,
  weeklyHours = 32.5,
  desiredWeeklyHours = 40,
  myRequests = mockSwapRequests,
  openShifts = mockOpenShifts,
  onPickupShift = () => {},
  onRequestSwap = () => {},
  loading = false,
}: StaffDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Row - Three Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <NextShiftCard shift={nextShift} onRequestSwap={onRequestSwap} />
        <WeekViewCard shifts={weekShifts} />
        <HoursCard weeklyHours={weeklyHours} desiredHours={desiredWeeklyHours} />
      </div>

      {/* Bottom Row - Two Columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SwapRequestsList requests={myRequests} />
        <OpenShiftsList shifts={openShifts} onPickup={onPickupShift} />
      </div>
    </div>
  )
}
