import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export const useWeekSchedule = (weekStart: string, locationId?: string | null) =>
  useQuery({
    queryKey: ['schedule', weekStart, locationId],
    queryFn: () =>
      api
        .get('/shifts/week', { params: { weekStart, ...(locationId && { locationId }) } })
        .then((r) => r.data.data ?? r.data),
    enabled: !!weekStart,
  })

export const useCreateShift = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/shifts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}

export const usePublishWeek = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { weekStart: string; locationId: string }) =>
      api.post('/shifts/publish', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}

export const useDeleteShift = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shiftId: string) => api.delete(`/shifts/${shiftId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}

export const useConstraintPreview = () =>
  useMutation({
    mutationFn: ({ shiftId, userId }: { shiftId: string; userId: string }) =>
      api
        .post('/assignments/preview', { shiftId, userId }, { timeout: 90_000 })
        .then((r) => r.data.data ?? r.data),
  })

export const useAssignStaff = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { shiftId: string; userId: string; overrideReason?: string }) =>
      api.post('/assignments', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export const useUnassignStaff = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shiftId, userId }: { shiftId: string; userId: string }) =>
      api.delete(`/assignments/${shiftId}/users/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}
