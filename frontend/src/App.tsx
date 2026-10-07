import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import {
  Alerts,
  DatasetInspector,
  Environment,
  OpticalSensing,
  Overview,
  PlantMonitoring,
  SensorHistory,
  SystemStatus,
} from './pages/DashboardPages'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/plants" element={<PlantMonitoring />} />
        <Route path="/optical" element={<OpticalSensing />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="/history" element={<SensorHistory />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/data" element={<DatasetInspector />} />
        <Route path="/system" element={<SystemStatus />} />
      </Route>
    </Routes>
  )
}