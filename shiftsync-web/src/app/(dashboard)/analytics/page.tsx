'use client'

import { useState } from 'react'
import { format, startOfWeek, subDays } from 'date-fns'
import { Loader2, AlertTriangle, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useOvertimeAnalytics, useFairnessAnalytics } from '@/hooks/useAnalytics'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-600 mt-0.5">Overtime risk and shift fairness across staff</p>
      </div>

      <Tabs defaultValue="overtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overtime">
            <AlertTriangle className="size-4 mr-2" />
            Overtime
          </TabsTrigger>
          <TabsTrigger value="fairness">
            <Award className="size-4 mr-2" />
            Fairness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overtime">
          <OvertimeTab />
        </TabsContent>

        <TabsContent value="fairness">
          <FairnessTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OvertimeTab() {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data, isLoading } = useOvertimeAnalytics(weekStart)

  if (isLoading)
    return (
      <Card className="p-12 text-center">
        <Loader2 className="size-5 animate-spin mx-auto" />
      </Card>
    )

  const summary = data?.summary
  const staff = data?.staff ?? []

  const chartData = staff
    .slice(0, 12)
    .map((s: any) => ({
      name: `${s.firstName[0]}.${s.lastName}`,
      hours: Math.round(s.totalHours * 10) / 10,
      status: s.overThreshold ? 'OVER' : s.atRisk ? 'AT_RISK' : 'NORMAL',
    }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Staff" value={summary?.totalStaff ?? 0} />
        <StatCard label="At Risk (35-40h)" value={summary?.atRisk ?? 0} tone="amber" />
        <StatCard label="Over Threshold (40h+)" value={summary?.overThreshold ?? 0} tone="red" />
        <StatCard
          label="Projected OT Cost"
          value={`$${Math.round(summary?.projectedOvertimeCost ?? 0)}`}
          tone="violet"
        />
      </div>

      {chartData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Hours per Staff (this week)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine
                    y={35}
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                    label={{ value: 'Warning (35h)', fontSize: 10, fill: '#F59E0B' }}
                  />
                  <ReferenceLine
                    y={40}
                    stroke="#DC2626"
                    strokeDasharray="3 3"
                    label={{ value: 'Overtime (40h)', fontSize: 10, fill: '#DC2626' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((d: any, i: number) => (
                      <Cell
                        key={i}
                        fill={
                          d.status === 'OVER'
                            ? '#DC2626'
                            : d.status === 'AT_RISK'
                            ? '#F59E0B'
                            : '#10B981'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detailed Breakdown</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-200 bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Hours This Week</th>
                <th className="px-4 py-2">Desired</th>
                <th className="px-4 py-2">Overtime</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s: any) => (
                <tr
                  key={s.userId}
                  className={cn(
                    s.overThreshold && 'bg-red-50/50',
                    s.atRisk && !s.overThreshold && 'bg-amber-50/50'
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {Math.round(s.totalHours * 10) / 10}h
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {s.desiredWeeklyHours ? `${s.desiredWeeklyHours}h` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {s.overtimeHours > 0 ? `+${Math.round(s.overtimeHours * 10) / 10}h` : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      className={cn(
                        'border-0 text-xs',
                        s.overThreshold
                          ? 'bg-red-100 text-red-800'
                          : s.atRisk
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {s.overThreshold ? 'Overtime' : s.atRisk ? 'At Risk' : 'On Track'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function FairnessTab() {
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const { data, isLoading } = useFairnessAnalytics(startDate, endDate)

  if (isLoading)
    return (
      <Card className="p-12 text-center">
        <Loader2 className="size-5 animate-spin mx-auto" />
      </Card>
    )

  const summary = data?.summary
  const staff = data?.staff ?? []
  const avg = parseFloat(summary?.averagePremiumPerStaff ?? '0')

  const chartData = staff
    .slice(0, 12)
    .map((s: any) => ({
      name: `${s.firstName} ${s.lastName[0]}.`,
      premium: s.premiumShifts,
    }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Premium Shifts" value={summary?.totalPremiumShifts ?? 0} />
        <StatCard label="Avg per Staff" value={summary?.averagePremiumPerStaff ?? '0'} />
        <StatCard label="Over-scheduled" value={summary?.overScheduled ?? 0} tone="red" />
        <StatCard label="Under-scheduled" value={summary?.underScheduled ?? 0} tone="amber" />
      </div>

      {chartData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Premium Shift Distribution (last 30 days)</CardTitle>
            <p className="text-xs text-slate-500">
              Sorted by premium shifts. Look for imbalance — some staff far above/below average.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  {avg > 0 && (
                    <ReferenceLine
                      x={avg}
                      stroke="#7C3AED"
                      strokeDasharray="3 3"
                      label={{ value: `Avg ${avg.toFixed(1)}`, fontSize: 10, fill: '#7C3AED' }}
                    />
                  )}
                  <Bar dataKey="premium" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-staff fairness</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-200 bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Total Shifts</th>
                <th className="px-4 py-2">Premium</th>
                <th className="px-4 py-2">Fairness Score</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s: any) => {
                const balanced = s.fairnessScore >= 80
                const imbalanced = s.fairnessScore >= 60 && s.fairnessScore < 80
                const severe = s.fairnessScore < 60
                return (
                  <tr key={s.userId}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{s.totalShifts}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">
                      {s.premiumShifts}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 max-w-[180px]">
                        <Progress value={s.fairnessScore} className="h-2" />
                        <span className="text-xs text-slate-600 shrink-0">
                          {s.fairnessScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className={cn(
                          'border-0 text-xs',
                          balanced && 'bg-emerald-100 text-emerald-800',
                          imbalanced && 'bg-amber-100 text-amber-800',
                          severe && 'bg-red-100 text-red-800'
                        )}
                      >
                        {balanced ? 'Balanced' : imbalanced ? 'Imbalanced' : 'Severely Imbalanced'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number | string
  tone?: 'slate' | 'amber' | 'red' | 'violet'
}) {
  const colors = {
    slate: 'text-slate-900',
    amber: 'text-amber-700',
    red: 'text-red-700',
    violet: 'text-violet-700',
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={cn('text-2xl font-bold mt-0.5', colors[tone])}>{value}</div>
      </CardContent>
    </Card>
  )
}
