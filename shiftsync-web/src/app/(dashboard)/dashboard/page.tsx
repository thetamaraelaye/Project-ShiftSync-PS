'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { startOfWeek, format } from 'date-fns'
import { useDashboardStats, useOnDutyNow, useOvertimeAnalytics, useFairnessAnalytics } from '@/hooks/useAnalytics'
import { useMyRequests, useOpenShifts, usePendingApprovals, useManagerDecision, usePickupShift } from '@/hooks/useCoverage'
import { useWeekSchedule, usePublishWeek } from '@/hooks/useSchedule'
import { getStoredUser, type AuthUser } from '@/lib/auth'
import api from '@/lib/api'
import { toast } from 'sonner'

const AdminDashboard = dynamic(() => import('@/components/dashboard/admin-dashboard').then(m => ({ default: m.AdminDashboard })), { ssr: false })
const ManagerDashboard = dynamic(() => import('@/components/dashboard/manager-dashboard').then(m => ({ default: m.ManagerDashboard })), { ssr: false })
const StaffDashboard = dynamic(() => import('@/components/dashboard/staff-dashboard').then(m => ({ default: m.StaffDashboard })), { ssr: false })

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  if (!user) return null

  if (user.role === 'ADMIN') return <AdminDashboardWrapper />
  if (user.role === 'MANAGER') return <ManagerDashboardWrapper />
  return <StaffDashboardWrapper user={user} />
}

// ─── Admin Dashboard Wrapper ─────────────────────────────────────────────────
function AdminDashboardWrapper() {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const stats = useDashboardStats()
  const onDuty = useOnDutyNow()
  const overtime = useOvertimeAnalytics(weekStart)
  const fairness = useFairnessAnalytics()

  const overtimeRisks = (overtime.data?.staff ?? [])
    .filter((s: any) => s.atRisk || s.overThreshold)
    .map((s: any) => ({
      userId: s.userId,
      firstName: s.firstName,
      lastName: s.lastName,
      totalHours: Math.round(s.totalHours * 10) / 10,
      status: s.overThreshold ? 'OVER' : 'AT_RISK',
    }))

  const fairnessAlerts = (fairness.data?.staff ?? [])
    .filter((s: any) => s.fairnessScore < 70 || s.premiumShifts === 0)
    .slice(0, 5)
    .map((s: any) => ({
      userId: s.userId,
      firstName: s.firstName,
      lastName: s.lastName,
      premiumShifts: s.premiumShifts,
      fairnessScore: s.fairnessScore,
    }))

  const onDutyStaff = (Array.isArray(onDuty.data) ? onDuty.data : []).map((a: any) => ({
    userId: a.user.id,
    firstName: a.user.firstName,
    lastName: a.user.lastName,
    locationName: a.shift.location.name,
    shiftEndTime: format(new Date(a.shift.endTime), 'h:mm a'),
    skill: a.shift.requiredSkill,
  }))

  const isLoading = stats.isLoading || overtime.isLoading

  return (
    <AdminDashboard
      stats={stats.data ?? undefined}
      overtimeRisks={overtimeRisks}
      fairnessAlerts={fairnessAlerts}
      onDutyStaff={onDutyStaff}
      loading={isLoading}
    />
  )
}

// ─── Manager Dashboard Wrapper ───────────────────────────────────────────────
function ManagerDashboardWrapper() {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const router = useRouter()
  const pending = usePendingApprovals()
  const overtime = useOvertimeAnalytics(weekStart)
  const schedule = useWeekSchedule(weekStart)
  const decide = useManagerDecision()
  const publish = usePublishWeek()

  const pendingApprovals = (Array.isArray(pending.data) ? pending.data : []).map((r: any) => ({
    id: r.id,
    type: r.type,
    requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
    targetName: r.target ? `${r.target.firstName} ${r.target.lastName}` : null,
    shiftDate: format(new Date(r.shift.startTime), 'EEE MMM d'),
    shiftTime: `${format(new Date(r.shift.startTime), 'h:mm a')} – ${format(new Date(r.shift.endTime), 'h:mm a')}`,
    locationName: r.shift.location.name,
    requiredSkill: r.shift.requiredSkill,
    reason: r.reason,
  }))

  const coverageGaps = (Array.isArray(schedule.data) ? schedule.data : [])
    .filter((s: any) => (s.assignments?.length ?? 0) < s.headcount && new Date(s.startTime) > new Date())
    .slice(0, 8)
    .map((s: any) => ({
      shiftId: s.id,
      locationName: s.location.name,
      date: format(new Date(s.startTime), 'EEE MMM d'),
      startTime: format(new Date(s.startTime), 'h:mm a'),
      endTime: format(new Date(s.endTime), 'h:mm a'),
      requiredSkill: s.requiredSkill,
      assigned: s.assignments?.length ?? 0,
      needed: s.headcount,
    }))

  const overtimeWarnings = (overtime.data?.staff ?? [])
    .filter((s: any) => s.totalHours >= 35)
    .slice(0, 5)
    .map((s: any) => ({
      userId: s.userId,
      name: `${s.firstName} ${s.lastName}`,
      totalHours: Math.round(s.totalHours * 10) / 10,
      projectedHours: Math.round(s.totalHours * 10) / 10,
    }))

  const allPublished = Array.isArray(schedule.data) && schedule.data.length > 0
    ? schedule.data.every((s: any) => s.status === 'PUBLISHED')
    : true

  const user = getStoredUser()
  const locationId = user?.managedLocationIds?.[0]

  const handleApprove = (id: string) => {
    decide.mutate({ id, decision: 'APPROVED' }, {
      onSuccess: () => toast.success('Request approved'),
      onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to approve'),
    })
  }
  const handleReject = (id: string) => {
    decide.mutate({ id, decision: 'REJECTED' }, {
      onSuccess: () => toast.success('Request rejected'),
      onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to reject'),
    })
  }
  const handlePublish = () => {
    if (!locationId) return toast.error('No location assigned')
    publish.mutate({ weekStart, locationId }, {
      onSuccess: (data: any) => toast.success(`Published ${data.published ?? 0} shifts`),
      onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to publish'),
    })
  }

  return (
    <ManagerDashboard
      pendingApprovals={pendingApprovals}
      coverageGaps={coverageGaps}
      overtimeWarnings={overtimeWarnings}
      weekPublished={allPublished}
      locationNames={[]}
      onApprove={handleApprove}
      onReject={handleReject}
      onFindCoverage={(id) => router.push(`/schedule?shiftId=${id}`)}
      onPublishSchedule={handlePublish}
      loading={pending.isLoading || schedule.isLoading}
    />
  )
}

// ─── Staff Dashboard Wrapper ─────────────────────────────────────────────────
function StaffDashboardWrapper({ user }: { user: AuthUser }) {
  const router = useRouter()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const schedule = useWeekSchedule(weekStart)
  const myRequests = useMyRequests()
  const openShifts = useOpenShifts()
  const pickup = usePickupShift()

  // Filter the week schedule for shifts the user is assigned to
  const myShifts = (Array.isArray(schedule.data) ? schedule.data : [])
    .flatMap((s: any) =>
      (s.assignments ?? [])
        .filter((a: any) => a.user?.id === user.id || a.userId === user.id)
        .map(() => ({
          id: s.id,
          locationName: s.location.name,
          locationTimezone: s.location.timezone,
          startTime: s.startTime,
          endTime: s.endTime,
          requiredSkill: s.requiredSkill,
          status: 'ASSIGNED' as const,
          isPremium: s.isPremium,
        }))
    )

  const upcoming = myShifts.filter((s: any) => new Date(s.startTime) > new Date())
  const nextShift = upcoming[0] ?? null

  const weeklyHours = myShifts.reduce((sum: number, s: any) => {
    const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
    return sum + ms / (1000 * 60 * 60)
  }, 0)

  const formattedRequests = (Array.isArray(myRequests.data) ? myRequests.data : []).map((r: any) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    shiftDate: format(new Date(r.shift.startTime), 'EEE MMM d'),
    locationName: r.shift.location.name,
    targetName: r.target ? `${r.target.firstName} ${r.target.lastName}` : null,
  }))

  const formattedOpenShifts = (Array.isArray(openShifts.data) ? openShifts.data : []).map((r: any) => ({
    id: r.shiftId,
    locationName: r.shift.location.name,
    date: format(new Date(r.shift.startTime), 'EEE MMM d'),
    startTime: format(new Date(r.shift.startTime), 'h:mm a'),
    endTime: format(new Date(r.shift.endTime), 'h:mm a'),
    requiredSkill: r.shift.requiredSkill,
    expiresAt: r.expiresAt,
    requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
  }))

  const handlePickup = (shiftId: string) => {
    pickup.mutate(shiftId, {
      onSuccess: () => toast.success('Pickup request submitted for manager approval'),
      onError: (e: any) => toast.error(e.response?.data?.message ?? 'Pickup failed'),
    })
  }

  return (
    <StaffDashboard
      nextShift={nextShift}
      weekShifts={myShifts}
      weeklyHours={Math.round(weeklyHours * 10) / 10}
      desiredWeeklyHours={user.desiredWeeklyHours ?? 40}
      myRequests={formattedRequests}
      openShifts={formattedOpenShifts}
      onPickupShift={handlePickup}
      onRequestSwap={(shiftId) => router.push(`/schedule?shiftId=${shiftId}`)}
      loading={schedule.isLoading || myRequests.isLoading}
    />
  )
}
