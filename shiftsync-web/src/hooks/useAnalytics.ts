import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data ?? r.data),
    refetchInterval: 60_000,
  })

export const useOnDutyNow = () =>
  useQuery({
    queryKey: ['on-duty'],
    queryFn: () => api.get('/analytics/on-duty').then((r) => r.data.data ?? r.data),
    refetchInterval: 60_000,
  })

export const useOvertimeAnalytics = (weekStart?: string, locationId?: string) =>
  useQuery({
    queryKey: ['analytics-overtime', weekStart, locationId],
    queryFn: () =>
      api
        .get('/analytics/overtime', { params: { weekStart, locationId } })
        .then((r) => r.data.data ?? r.data),
  })

export const useFairnessAnalytics = (startDate?: string, endDate?: string, locationId?: string) =>
  useQuery({
    queryKey: ['analytics-fairness', startDate, endDate, locationId],
    queryFn: () =>
      api
        .get('/analytics/fairness', { params: { startDate, endDate, locationId } })
        .then((r) => r.data.data ?? r.data),
  })
