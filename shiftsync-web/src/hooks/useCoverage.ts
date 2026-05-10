import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export const useMyRequests = () =>
  useQuery({
    queryKey: ['coverage', 'mine'],
    queryFn: () => api.get('/coverage/requests/mine').then((r) => r.data.data ?? r.data),
  })

export const useOpenShifts = () =>
  useQuery({
    queryKey: ['coverage', 'open'],
    queryFn: () => api.get('/coverage/requests/open-shifts').then((r) => r.data.data ?? r.data),
  })

export const usePendingApprovals = () =>
  useQuery({
    queryKey: ['coverage', 'pending'],
    queryFn: () =>
      api.get('/coverage/requests/pending-approvals').then((r) => r.data.data ?? r.data),
  })

export const useCreateSwapRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { shiftId: string; type: 'SWAP' | 'DROP'; targetId?: string; reason?: string }) =>
      api.post('/coverage/requests', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  })
}

export const useRespondToSwap = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: 'ACCEPTED' | 'REJECTED' }) =>
      api.patch(`/coverage/requests/${id}/respond`, { response }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  })
}

export const useManagerDecision = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.patch(`/coverage/requests/${id}/manager-decision`, { decision }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coverage'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export const usePickupShift = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shiftId: string) =>
      api.post(`/coverage/pickup/${shiftId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coverage'] })
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}

export const useCancelRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/coverage/requests/${id}/cancel`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage'] }),
  })
}
