"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  MapPin,
  Search,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SKILL_COLORS } from "@/lib/constants"
import type { PendingApproval, CoverageGap, OvertimeWarning } from "@/lib/types"

// Mock data
const mockPendingApprovals: PendingApproval[] = [
  {
    id: "1",
    type: "SWAP",
    requesterName: "Emily Rodriguez",
    targetName: "Sarah Chen",
    shiftDate: "Jan 10",
    shiftTime: "6:00 PM - 11:00 PM",
    locationName: "Downtown Bar & Grill",
    requiredSkill: "SERVER",
    reason: "Family event",
  },
  {
    id: "2",
    type: "DROP",
    requesterName: "Marcus Johnson",
    targetName: null,
    shiftDate: "Jan 11",
    shiftTime: "5:00 PM - 1:00 AM",
    locationName: "Mission District Tavern",
    requiredSkill: "BARTENDER",
    reason: "Medical appointment",
  },
  {
    id: "3",
    type: "SWAP",
    requesterName: "James Wilson",
    targetName: "David Kim",
    shiftDate: "Jan 12",
    shiftTime: "10:00 AM - 4:00 PM",
    locationName: "Oakland Waterfront",
    requiredSkill: "COOK",
    reason: null,
  },
]

const mockCoverageGaps: CoverageGap[] = [
  {
    shiftId: "gap1",
    locationName: "Mission District Tavern",
    date: "Jan 10",
    startTime: "6:00 PM",
    endTime: "11:00 PM",
    requiredSkill: "BARTENDER",
    assigned: 1,
    needed: 3,
  },
  {
    shiftId: "gap2",
    locationName: "Berkeley Bistro",
    date: "Jan 11",
    startTime: "5:00 PM",
    endTime: "10:00 PM",
    requiredSkill: "SERVER",
    assigned: 2,
    needed: 4,
  },
]

const mockOvertimeWarnings: OvertimeWarning[] = [
  { userId: "1", name: "Marcus Johnson", totalHours: 38.5, projectedHours: 43 },
  { userId: "2", name: "Sarah Chen", totalHours: 36, projectedHours: 41 },
  { userId: "3", name: "David Kim", totalHours: 35, projectedHours: 38.5 },
]

interface ManagerDashboardProps {
  pendingApprovals?: PendingApproval[]
  coverageGaps?: CoverageGap[]
  overtimeWarnings?: OvertimeWarning[]
  weekPublished?: boolean
  locationNames?: string[]
  onApprove?: (requestId: string) => void
  onReject?: (requestId: string) => void
  onFindCoverage?: (shiftId: string) => void
  onPublishSchedule?: () => void
  loading?: boolean
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: {
  approval: PendingApproval
  onApprove: () => void
  onReject: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 500))
    onApprove()
    setIsProcessing(false)
  }

  const handleReject = async () => {
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 500))
    onReject()
    setIsProcessing(false)
  }

  return (
    <Card className="border-l-4 border-l-indigo-500 border-slate-200 bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge className={cn("border-0 text-xs font-semibold", approval.type === "SWAP" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700")}>
                {approval.type}
              </Badge>
              <Badge className={cn("border-0 text-xs", SKILL_COLORS[approval.requiredSkill].badge)}>
                {approval.requiredSkill.replace("_", " ")}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-900">{approval.requesterName}</span>
              {approval.targetName && (
                <>
                  <ArrowRight className="size-4 text-slate-400" />
                  <span className="font-medium text-slate-900">{approval.targetName}</span>
                </>
              )}
              {!approval.targetName && approval.type === "DROP" && (
                <span className="text-slate-500">(Open Drop)</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {approval.shiftDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {approval.shiftTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {approval.locationName}
              </span>
            </div>

            {approval.reason && (
              <p className="mt-2 text-sm italic text-slate-600">&ldquo;{approval.reason}&rdquo;</p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="mr-1 size-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Check className="mr-1 size-4" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CoverageGapRow({ gap, onFindCoverage }: { gap: CoverageGap; onFindCoverage: () => void }) {
  const shortage = gap.needed - gap.assigned
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="font-medium text-slate-900">{gap.locationName}</p>
          <p className="text-sm text-slate-500">{gap.date}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Clock className="size-4" />
          {gap.startTime} - {gap.endTime}
        </div>
        <Badge className={cn("border-0 text-xs", SKILL_COLORS[gap.requiredSkill].badge)}>
          {gap.requiredSkill.replace("_", " ")}
        </Badge>
        <div className="flex items-center gap-1">
          <span className={cn("text-sm font-semibold", gap.assigned === 0 ? "text-red-600" : "text-amber-600")}>
            {gap.assigned}/{gap.needed}
          </span>
          <span className="text-xs text-red-600">({shortage} needed)</span>
        </div>
      </div>
      <Button size="sm" onClick={onFindCoverage} className="bg-indigo-500 hover:bg-indigo-600">
        <Search className="mr-1 size-4" />
        Find Coverage
      </Button>
    </div>
  )
}

function OvertimeWarningRow({ warning }: { warning: OvertimeWarning }) {
  const isOvertime = warning.projectedHours > 40
  const percentage = (warning.totalHours / 40) * 100
  const projectedPercentage = (warning.projectedHours / 40) * 100

  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border-l-4 p-4",
      isOvertime ? "border-l-red-500 bg-red-50" : "border-l-amber-500 bg-amber-50"
    )}>
      <div>
        <p className="font-medium text-slate-900">{warning.name}</p>
        <p className="text-sm text-slate-600">
          {warning.totalHours}h this week → projected {warning.projectedHours}h
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-32">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn("h-full rounded-full", isOvertime ? "bg-red-500" : "bg-amber-500")}
              style={{ width: `${Math.min(projectedPercentage, 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px]">
            <span className="text-slate-500">{warning.totalHours}h</span>
            <span className={isOvertime ? "text-red-600 font-medium" : "text-amber-600"}>{warning.projectedHours}h</span>
          </div>
        </div>
        <Badge className={cn("border-0 text-xs", isOvertime ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
          {isOvertime ? "OVERTIME" : "AT RISK"}
        </Badge>
      </div>
    </div>
  )
}

export function ManagerDashboard({
  pendingApprovals = mockPendingApprovals,
  coverageGaps = mockCoverageGaps,
  overtimeWarnings = mockOvertimeWarnings,
  weekPublished = false,
  onApprove = () => {},
  onReject = () => {},
  onFindCoverage = () => {},
  onPublishSchedule = () => {},
  loading = false,
}: ManagerDashboardProps) {
  const [dismissedApprovals, setDismissedApprovals] = useState<string[]>([])
  const visibleApprovals = pendingApprovals.filter((a) => !dismissedApprovals.includes(a.id))

  const handleApprove = (id: string) => {
    onApprove(id)
    setDismissedApprovals((prev) => [...prev, id])
  }

  const handleReject = (id: string) => {
    onReject(id)
    setDismissedApprovals((prev) => [...prev, id])
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Publish Banner */}
      {!weekPublished && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              This week&apos;s schedule is not yet published — staff cannot see their shifts
            </p>
          </div>
          <Button onClick={onPublishSchedule} className="bg-indigo-500 hover:bg-indigo-600">
            Publish Now
          </Button>
        </div>
      )}

      {/* Pending Approvals + Coverage Gaps */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              {visibleApprovals.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-0">{visibleApprovals.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleApprovals.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                <Check className="size-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">No pending approvals — you&apos;re caught up</p>
              </div>
            ) : (
              <>
                {visibleApprovals.slice(0, 5).map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={() => handleApprove(approval.id)}
                    onReject={() => handleReject(approval.id)}
                  />
                ))}
                {visibleApprovals.length > 5 && (
                  <Link href="/coverage" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    View all {visibleApprovals.length} requests
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Coverage Gaps */}
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Coverage Gaps This Week</CardTitle>
              {coverageGaps.length > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0">{coverageGaps.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {coverageGaps.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                <Check className="size-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">All shifts are fully staffed</p>
              </div>
            ) : (
              coverageGaps.map((gap) => (
                <CoverageGapRow key={gap.shiftId} gap={gap} onFindCoverage={() => onFindCoverage(gap.shiftId)} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overtime Warnings + Schedule Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overtime Warnings */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              Overtime Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overtimeWarnings.length === 0 ? (
              <p className="text-sm text-slate-500">No overtime concerns this week</p>
            ) : (
              overtimeWarnings.map((warning) => (
                <OvertimeWarningRow key={warning.userId} warning={warning} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Schedule Overview */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className="border-0 bg-indigo-100 text-indigo-700">Week of Jan 6</Badge>
              <Badge className={cn("border-0", weekPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {weekPublished ? "PUBLISHED" : "DRAFT"}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">142</p>
                <p className="text-xs text-slate-500">Published</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">14</p>
                <p className="text-xs text-slate-500">Draft</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{coverageGaps.length}</p>
                <p className="text-xs text-slate-500">Gaps</p>
              </div>
            </div>

            <Link href="/schedule">
              <Button variant="outline" className="mt-4 w-full">
                <Calendar className="mr-2 size-4" />
                View Full Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
