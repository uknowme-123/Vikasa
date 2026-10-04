import { useQuery } from '@tanstack/react-query'
import { getDataProvider } from '../services/api'
import type { SensorReadingWithMeta, PlantSummary, SessionSummary, SystemStatus } from '../types/sensor'

export function useReadings() {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['readings'],
    queryFn: () => provider.getReadings(),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlantSummaries() {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['plantSummaries'],
    queryFn: () => provider.getPlantSummaries(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSessionSummaries() {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['sessionSummaries'],
    queryFn: () => provider.getSessionSummaries(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSystemStatus() {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => provider.getSystemStatus(),
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  })
}

export function usePlantReadings(plantId: string | null) {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['plantReadings', plantId],
    queryFn: () => {
      if (!plantId) return []
      return provider.getReadingsForPlant(plantId)
    },
    enabled: !!plantId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSessionReadings(sessionId: string | null) {
  const provider = getDataProvider()
  return useQuery({
    queryKey: ['sessionReadings', sessionId],
    queryFn: () => {
      if (!sessionId) return []
      return provider.getReadingsForSession(sessionId)
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  })
}