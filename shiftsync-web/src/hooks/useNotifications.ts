import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () =>
      api
        .get('/notifications', { params: { unreadOnly } })
        .then((r) => r.data.data ?? r.data),
  })

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notification-count'],
    queryFn: () =>
      api.get('/notifications/unread-count').then((r) => r.data.data?.count ?? r.data.count ?? 0),
    refetchInterval: 30_000,
  })

export const useMarkRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}

export const useMarkAllRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })
}
