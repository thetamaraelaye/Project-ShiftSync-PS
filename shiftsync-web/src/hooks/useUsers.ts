import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export const useUsers = (locationId?: string) =>
  useQuery({
    queryKey: ['users', locationId],
    queryFn: () =>
      api
        .get('/users', { params: locationId ? { locationId } : undefined })
        .then((r) => r.data.data ?? r.data),
  })

export const useUser = (id: string | null) =>
  useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data.data ?? r.data),
    enabled: !!id,
  })

export const useUserAvailability = (id: string | null) =>
  useQuery({
    queryKey: ['user-availability', id],
    queryFn: () => api.get(`/users/${id}/availability`).then((r) => r.data.data ?? r.data),
    enabled: !!id,
  })

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export const useSetSkills = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, skills }: { userId: string; skills: string[] }) =>
      api.post(`/users/${userId}/skills`, { skills }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['user', vars.userId] })
    },
  })
}

export const useSetAvailability = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, availability }: { userId: string; availability: any[] }) =>
      api.post(`/users/${userId}/availability`, { availability }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['user-availability', vars.userId] })
    },
  })
}

export const useCreateException = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      api.post(`/users/${userId}/availability/exceptions`, data).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['user-availability', vars.userId] })
    },
  })
}

export const useDeleteException = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, exceptionId }: { userId: string; exceptionId: string }) =>
      api.delete(`/users/${userId}/availability/exceptions/${exceptionId}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['user-availability', vars.userId] })
    },
  })
}
