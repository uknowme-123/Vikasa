import { useQuery } from '@tanstack/react-query'
import { getDataProvider } from '../services/api'

export const useReadings = () => useQuery({
  queryKey: ['readings'],
  queryFn: () => getDataProvider().getReadings(),
  refetchInterval: 1_000,
})
export const usePlants = () => useQuery({ queryKey: ['plants'], queryFn: () => getDataProvider().getPlantSummaries() })
export const useStatus = () => useQuery({ queryKey: ['status'], queryFn: () => getDataProvider().getSystemStatus() })
export const useAlerts = () => useQuery({ queryKey: ['alerts'], queryFn: () => getDataProvider().getAlerts() })
