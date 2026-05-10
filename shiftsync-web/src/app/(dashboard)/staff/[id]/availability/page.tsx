'use client'

import { use, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, Plus, X, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useUser, useUserAvailability, useSetAvailability, useCreateException, useDeleteException } from '@/hooks/useUsers'
import { toast } from 'sonner'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface AvailabilityWindow {
  dayOfWeek: number
  enabled: boolean
  startTime: string
  endTime: string
}

export default function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: user } = useUser(id)
  const { data: availData, isLoading } = useUserAvailability(id)
  const setAvail = useSetAvailability()
  const createException = useCreateException()
  const deleteException = useDeleteException()

  const [windows, setWindows] = useState<AvailabilityWindow[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, enabled: false, startTime: '09:00', endTime: '17:00' }))
  )

  // Hydrate when data loads
  useEffect(() => {
    if (!availData?.recurring) return
    const recurring = availData.recurring as any[]
    setWindows(
      DAYS.map((_, i) => {
        const existing = recurring.find((r) => r.dayOfWeek === i)
        return existing
          ? { dayOfWeek: i, enabled: true, startTime: existing.startTime, endTime: existing.endTime }
          : { dayOfWeek: i, enabled: false, startTime: '09:00', endTime: '17:00' }
      })
    )
  }, [availData])

  const exceptions = availData?.exceptions ?? []

  // Exception form state
  const [excDate, setExcDate] = useState('')
  const [excReason, setExcReason] = useState('')

  function saveAvailability() {
    const availability = windows
      .filter((w) => w.enabled)
      .map((w) => ({ dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: w.endTime }))
    setAvail.mutate(
      { userId: id, availability },
      {
        onSuccess: () => toast.success('Availability saved'),
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Save failed'),
      }
    )
  }

  function addException() {
    if (!excDate) return toast.error('Pick a date')
    createException.mutate(
      { userId: id, data: { date: excDate, isUnavailable: true, reason: excReason || undefined } },
      {
        onSuccess: () => {
          toast.success('Exception added')
          setExcDate('')
          setExcReason('')
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
      }
    )
  }

  if (isLoading)
    return (
      <Card className="p-12 text-center">
        <Loader2 className="size-5 animate-spin mx-auto" />
      </Card>
    )

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Availability {user && `· ${user.firstName} ${user.lastName}`}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Times shown in {user?.timezone ?? 'user timezone'}
        </p>
      </div>

      {/* Recurring weekly */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recurring weekly schedule</CardTitle>
          <Button
            size="sm"
            onClick={saveAvailability}
            disabled={setAvail.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {setAvail.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {windows.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <div className="w-24 font-medium text-sm text-slate-700">{DAYS[w.dayOfWeek]}</div>
              <Switch
                checked={w.enabled}
                onCheckedChange={(v) =>
                  setWindows((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, enabled: v } : x))
                  )
                }
              />
              <div className="flex-1 flex items-center gap-2">
                {w.enabled ? (
                  <>
                    <Input
                      type="time"
                      value={w.startTime}
                      onChange={(e) =>
                        setWindows((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, startTime: e.target.value } : x
                          )
                        )
                      }
                      className="w-32"
                    />
                    <span className="text-slate-400">to</span>
                    <Input
                      type="time"
                      value={w.endTime}
                      onChange={(e) =>
                        setWindows((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, endTime: e.target.value } : x
                          )
                        )
                      }
                      className="w-32"
                    />
                  </>
                ) : (
                  <span className="text-sm text-slate-400">Unavailable</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Exceptions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Date-specific exceptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={excDate}
              onChange={(e) => setExcDate(e.target.value)}
              className="sm:w-44"
            />
            <Input
              placeholder="Reason (optional)"
              value={excReason}
              onChange={(e) => setExcReason(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={addException}
              disabled={createException.isPending}
              variant="outline"
            >
              <Plus className="size-4 mr-1" />
              Add
            </Button>
          </div>

          {exceptions.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No upcoming exceptions</p>
          ) : (
            <div className="space-y-1.5">
              {exceptions.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 bg-amber-50 border border-amber-100 rounded-md"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="size-4 text-amber-700" />
                    <span className="font-medium text-amber-900">
                      {format(new Date(e.date), 'EEE, MMM d, yyyy')}
                    </span>
                    {e.reason && <span className="text-amber-700">— {e.reason}</span>}
                    {e.isUnavailable && (
                      <span className="text-xs text-amber-600">(Unavailable)</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      deleteException.mutate(
                        { userId: id, exceptionId: e.id },
                        { onSuccess: () => toast.success('Exception removed') }
                      )
                    }
                  >
                    <X className="size-4 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
