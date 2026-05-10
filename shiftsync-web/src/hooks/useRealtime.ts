'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import { isAuthenticated } from '@/lib/auth'

export function useRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated()) return

    const socket = getSocket()

    // Schedule updates
    socket.on('shift:assigned', () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })
    socket.on('shift:unassigned', () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
    })
    socket.on('schedule:published', () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })
    socket.on('schedule:refresh', () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    // Coverage / swap updates
    socket.on('swap:request', () => {
      qc.invalidateQueries({ queryKey: ['coverage'] })
    })
    socket.on('swap:status', () => {
      qc.invalidateQueries({ queryKey: ['coverage'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    // Notifications
    socket.on('notification:new', (notification: any) => {
      qc.setQueryData(['notifications'], (old: any[] = []) => [notification, ...old])
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    })

    return () => {
      socket.off('shift:assigned')
      socket.off('shift:unassigned')
      socket.off('schedule:published')
      socket.off('schedule:refresh')
      socket.off('swap:request')
      socket.off('swap:status')
      socket.off('notification:new')
    }
  }, [qc])
}
