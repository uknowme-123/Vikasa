import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Overview } from './pages/Overview'
import { PlantMonitoring } from './pages/PlantMonitoring'
import { OpticalSensing } from './pages/OpticalSensing'
import { Trends } from './pages/Trends'
import { Alerts } from './pages/Alerts'
import { DataManagement } from './pages/DataManagement'
import { SystemStatus } from './pages/SystemStatus'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/plants" element={<PlantMonitoring />} />
        <Route path="/optical" element={<OpticalSensing />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/data" element={<DataManagement />} />
        <Route path="/status" element={<SystemStatus />} />
      </Route>
    </Routes>
  )
}

export default App