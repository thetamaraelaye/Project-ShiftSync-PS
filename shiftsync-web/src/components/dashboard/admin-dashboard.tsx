"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SKILL_COLORS, AUDIT_ACTION_COLORS } from "@/lib/constants"
import type {
  DashboardStats,
  LocationStatus,
  OvertimeRisk,
  FairnessAlert,
  AuditEntry,
  OnDutyStaff,
} from "@/lib/types"

// Mock data
const mockStats: DashboardStats = {
  totalStaff: 47,
  shiftsThisWeek: 156,
  publishedShifts: 142,
  draftShifts: 14,
  pendingApprovals: 5,
  overtimeAtRisk: 3,
  onDutyNow: 12,
}

const mockLocations: LocationStatus[] = [
  { id: "1", name: "Downtown Bar & Grill", city: "San Francisco", timezone: "PST", staffOnDuty: 4, shiftsToday: 8, coverageGaps: 0, publishStatus: "PUBLISHED" },
  { id: "2", name: "Mission District Tavern", city: "San Francisco", timezone: "PST", staffOnDuty: 3, shiftsToday: 6, coverageGaps: 1, publishStatus: "MIXED" },
  { id: "3", name: "Oakland Waterfront", city: "Oakland", timezone: "PST", staffOnDuty: 3, shiftsToday: 7, coverageGaps: 0, publishStatus: "PUBLISHED" },
  { id: "4", name: "Berkeley Bistro", city: "Berkeley", timezone: "PST", staffOnDuty: 2, shiftsToday: 5, coverageGaps: 2, publishStatus: "DRAFT" },
]

const mockOnDutyStaff: OnDutyStaff[] = [
  { userId: "1", firstName: "Sarah", lastName: "Chen", locationName: "Downtown Bar & Grill", shiftEndTime: "11:00 PM", skill: "BARTENDER" },
  { userId: "2", firstName: "Marcus", lastName: "Johnson", locationName: "Downtown Bar & Grill", shiftEndTime: "10:00 PM", skill: "SERVER" },
  { userId: "3", firstName: "Emily", lastName: "Rodriguez", locationName: "Mission District Tavern", shiftEndTime: "9:00 PM", skill: "HOST" },
  { userId: "4", firstName: "James", lastName: "Wilson", locationName: "Oakland Waterfront", shiftEndTime: "11:30 PM", skill: "COOK" },
  { userId: "5", firstName: "Aisha", lastName: "Patel", locationName: "Berkeley Bistro", shiftEndTime: "10:00 PM", skill: "BARTENDER" },
]

const mockOvertimeRisks: OvertimeRisk[] = [
  { userId: "1", firstName: "Marcus", lastName: "Johnson", totalHours: 42.5, status: "OVER" },
  { userId: "2", firstName: "Sarah", lastName: "Chen", totalHours: 38.5, status: "AT_RISK" },
  { userId: "3", firstName: "David", lastName: "Kim", totalHours: 36, status: "AT_RISK" },
]

const mockFairnessAlerts: FairnessAlert[] = [
  { userId: "1", firstName: "Emily", lastName: "Rodriguez", premiumShifts: 1, fairnessScore: 45 },
  { userId: "2", firstName: "Alex", lastName: "Thompson", premiumShifts: 0, fairnessScore: 38 },
  { userId: "3", firstName: "Maria", lastName: "Santos", premiumShifts: 2, fairnessScore: 62 },
]

const mockAuditEntries: AuditEntry[] = [
  { id: "1", action: "ASSIGNED", actorName: "John Manager", actorRole: "MANAGER", entityType: "Assigned Sarah Chen to Friday PM shift", createdAt: "2 hours ago" },
  { id: "2", action: "PUBLISHED", actorName: "Admin User", actorRole: "ADMIN", entityType: "Published schedule for Week 2", createdAt: "3 hours ago" },
  { id: "3", action: "SWAP", actorName: "Emily Rodriguez", actorRole: "STAFF", entityType: "Requested swap for Saturday shift", createdAt: "4 hours ago" },
  { id: "4", action: "UNASSIGNED", actorName: "John Manager", actorRole: "MANAGER", entityType: "Removed Marcus from Sunday shift", createdAt: "5 hours ago" },
  { id: "5", action: "ASSIGNED", actorName: "John Manager", actorRole: "MANAGER", entityType: "Assigned James Wilson to cook shift", createdAt: "6 hours ago" },
]

interface AdminDashboardProps {
  stats?: DashboardStats
  locations?: LocationStatus[]
  overtimeRisks?: OvertimeRisk[]
  fairnessAlerts?: FairnessAlert[]
  recentAudit?: AuditEntry[]
  onDutyStaff?: OnDutyStaff[]
  loading?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  showPulse,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  iconColor: string
  showPulse?: boolean
}) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("relative flex size-12 items-center justify-center rounded-xl", iconColor)}>
          <Icon className="size-6 text-white" />
          {showPulse && (
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function LocationCard({ location }: { location: LocationStatus }) {
  const coverageStatus = location.coverageGaps === 0 ? "FULL" : location.coverageGaps === 1 ? "PARTIAL" : "GAPS"
  const coverageColor = {
    FULL: "bg-emerald-100 text-emerald-800",
    PARTIAL: "bg-amber-100 text-amber-800",
    GAPS: "bg-red-100 text-red-800",
  }[coverageStatus]

  const publishColor = {
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    DRAFT: "bg-slate-100 text-slate-600",
    MIXED: "bg-amber-100 text-amber-700",
  }[location.publishStatus]

  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-slate-900">{location.name}</h4>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="size-3.5" />
              {location.city} ({location.timezone})
            </div>
          </div>
          <Badge className={cn("border-0 text-xs font-medium", publishColor)}>
            {location.publishStatus}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-lg font-bold text-slate-900">{location.staffOnDuty}</span>
            </div>
            <p className="text-xs text-slate-500">On duty</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{location.shiftsToday}</p>
            <p className="text-xs text-slate-500">Today</p>
          </div>
          <div>
            <Badge className={cn("border-0 text-xs", coverageColor)}>
              {coverageStatus === "FULL" ? "Fully Staffed" : `${location.coverageGaps} Gap${location.coverageGaps > 1 ? "s" : ""}`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OnDutyWidget({ staff, loading }: { staff: OnDutyStaff[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-emerald-500" />
            On Duty Now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-emerald-500" />
            On Duty Now
          </CardTitle>
          <span className="text-xs text-slate-400">Updated just now</span>
        </div>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No staff currently on duty</p>
        ) : (
          <div className="space-y-3">
            {staff.slice(0, 5).map((s) => (
              <div key={s.userId} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-indigo-100 text-xs font-medium text-indigo-700">
                      {s.firstName[0]}{s.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-slate-500">{s.locationName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("border-0 text-[10px]", SKILL_COLORS[s.skill].badge)}>
                    {s.skill.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-slate-500">Until {s.shiftEndTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OvertimeTable({ risks, loading }: { risks: OvertimeRisk[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-red-500" />
            Overtime Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-red-500" />
          Overtime Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {risks.map((risk) => {
            const percentage = (risk.totalHours / 40) * 100
            const isOver = risk.status === "OVER"
            return (
              <div
                key={risk.userId}
                className={cn(
                  "flex items-center justify-between rounded-lg border-l-4 p-3",
                  isOver ? "border-l-red-500 bg-red-50" : "border-l-amber-500 bg-amber-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className={cn("text-xs font-medium", isOver ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                      {risk.firstName[0]}{risk.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-slate-900">{risk.firstName} {risk.lastName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <div className="flex justify-between text-xs">
                      <span className={isOver ? "text-red-700" : "text-amber-700"}>{risk.totalHours}h</span>
                      <span className="text-slate-400">/ 40h</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn("h-full rounded-full", isOver ? "bg-red-500" : "bg-amber-500")}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <Badge className={cn("border-0 text-xs", isOver ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                    {risk.status === "OVER" ? "OVERTIME" : "AT RISK"}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function FairnessWidget({ alerts, loading }: { alerts: FairnessAlert[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-amber-500" />
            Fairness Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-amber-500" />
          Fairness Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const scoreColor = alert.fairnessScore < 50 ? "red" : alert.fairnessScore < 70 ? "amber" : "emerald"
            return (
              <div key={alert.userId} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-slate-200 text-xs font-medium text-slate-600">
                      {alert.firstName[0]}{alert.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{alert.firstName} {alert.lastName}</p>
                    <p className="text-xs text-slate-500">{alert.premiumShifts} premium shifts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn("h-full rounded-full", {
                          "bg-red-500": scoreColor === "red",
                          "bg-amber-500": scoreColor === "amber",
                          "bg-emerald-500": scoreColor === "emerald",
                        })}
                        style={{ width: `${alert.fairnessScore}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[10px] text-slate-400">{alert.fairnessScore}%</p>
                  </div>
                  <Badge className={cn("border-0 text-xs", {
                    "bg-red-100 text-red-700": alert.premiumShifts === 0,
                    "bg-amber-100 text-amber-700": alert.premiumShifts > 0 && alert.fairnessScore < 70,
                  })}>
                    {alert.premiumShifts === 0 ? "UNDER-ASSIGNED" : "IMBALANCED"}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function AuditTimeline({ entries, loading }: { entries: AuditEntry[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Audit Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Audit Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn("flex size-8 items-center justify-center rounded-full", AUDIT_ACTION_COLORS[entry.action as keyof typeof AUDIT_ACTION_COLORS] || "bg-slate-100")}>
                  <ArrowRight className="size-4" />
                </div>
                {idx < entries.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <Badge className={cn("border-0 text-xs", AUDIT_ACTION_COLORS[entry.action as keyof typeof AUDIT_ACTION_COLORS] || "bg-slate-100 text-slate-700")}>
                    {entry.action}
                  </Badge>
                  <span className="text-xs text-slate-400">{entry.createdAt}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{entry.entityType}</p>
                <p className="text-xs text-slate-500">by {entry.actorName} ({entry.actorRole})</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminDashboard({
  stats = mockStats,
  locations = mockLocations,
  overtimeRisks = mockOvertimeRisks,
  fairnessAlerts = mockFairnessAlerts,
  recentAudit = mockAuditEntries,
  onDutyStaff = mockOnDutyStaff,
  loading = false,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Active Staff" value={stats.totalStaff} iconColor="bg-slate-600" />
        <StatCard icon={CalendarDays} label="Shifts This Week" value={stats.shiftsThisWeek} iconColor="bg-indigo-500" />
        <StatCard icon={Activity} label="On Duty Now" value={stats.onDutyNow} iconColor="bg-emerald-500" showPulse />
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingApprovals} iconColor="bg-amber-500" />
        <StatCard icon={AlertTriangle} label="Overtime At Risk" value={stats.overtimeAtRisk} iconColor="bg-red-500" />
      </div>

      {/* Location Status + On Duty */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Location Status</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((loc) => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <OnDutyWidget staff={onDutyStaff} loading={loading} />
        </div>
      </div>

      {/* Overtime + Fairness */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OvertimeTable risks={overtimeRisks} loading={loading} />
        <FairnessWidget alerts={fairnessAlerts} loading={loading} />
      </div>

      {/* Audit Timeline */}
      <AuditTimeline entries={recentAudit} loading={loading} />
    </div>
  )
}
