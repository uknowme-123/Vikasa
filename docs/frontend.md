# Vikāsa Frontend Dashboard

React + TypeScript + Vite frontend for the Vikāsa plant stress monitoring system. The dashboard connects to the Flask API and displays live sensor data with a 10-second polling interval.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

The development server will start at `http://localhost:5173`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on source files |

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, Sidebar, Layout wrapper
│   │   ├── charts/       # Chart components (inline in pages)
│   │   ├── ui/           # Button, Card, Badge, Table, AlertBanner, ProviderSwitcher
│   │   └── forms/        # FileUpload
│   ├── pages/            # Route-level pages
│   │   ├── DashboardPages.tsx  # All page components
│   ├── services/
│   │   ├── api.ts        # Data provider interface (demo ↔ Flask)
│   │   └── demoData.ts   # Clearly labeled demo data
│   ├── hooks/
│   │   └── useSensorData.ts  # TanStack Query hooks
│   ├── types/
│   │   └── sensor.ts     # Zod schema + TS types matching CSV schema
│   ├── styles/
│   │   ├── index.css     # Tailwind + custom components
│   │   └── theme.ts      # Design tokens
│   ├── App.tsx           # Router configuration
│   └── main.tsx          # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Dashboard Pages

### Pages
- **Overview** — Environmental sensor cards, plant status summaries, trend charts
- **Plant Monitoring** — Plant/session selection, measurement history tables
- **Optical Sensing** — Red/NIR raw & calibrated reflectance, NDVI, comparison charts
- **Sensor History** — Timestamped reading table
- **Alerts** — Calibration and operational notices
- **Dataset / CSV Inspector** — Browser-local CSV structure inspection with provenance warnings
- **System Status** — Explicit API, ESP32, and Firebase readiness states

### Data Architecture
- **Typed interfaces** (`src/types/sensor.ts`) mirror the backend sensor schema.
- **Zod validation** protects CSV inspection and keeps unavailable values undefined.
- **Data provider layer** (`src/services/api.ts`) separates demo data from future Flask API access.
- **TanStack Query** handles loading, retry states, and **10-second polling** for readings.
- **Demo data** is always labeled and never presented as a hardware measurement.

### Data Integrity Rules (Enforced)
- Calibrated fields (`red_reflectance`, `nir_reflectance`, `ndvi`, `soil_moisture_pct`) are `number | null` — **never default to 0**
- Missing values display as **"Not available"** — never as zero
- NDVI computed **only** when both reflectances are non-null
- Raw ADC counts kept separate from calibrated measurements
- Environmental and spectroscopy datasets kept separate unless compatibility verified
- **Raw NDVI estimate** (from ADC counts) displayed only when calibrated reflectance is unavailable, clearly labeled as an estimate

## 10-Second Dashboard Polling

The `useReadings` hook in `src/hooks/useSensorData.ts` polls `/api/readings` every **10 seconds** (`refetchInterval: 10_000`). This ensures the dashboard reflects the latest sensor readings without manual refresh.

**To verify polling works:**
1. Start backend (`python -m backend.app`) and frontend (`npm run dev`)
2. Open browser dev tools → Network tab
3. Observe repeated `GET /api/readings` requests every 10 seconds
4. The displayed reading timestamp advances as new data arrives

**Implementation:**
```typescript
export const useReadings = () => useQuery({
  queryKey: ['readings'],
  queryFn: () => getDataProvider().getReadings(),
  refetchInterval: 10_000,  // 10 seconds
})
```

Polling cleanup is handled automatically by TanStack Query when the component unmounts. No overlapping requests are created.

## API Integration

### Backend Endpoints Consumed
The frontend consumes the following Flask API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | System health check |
| `/api/readings` / `/api/sensor-data` | POST | Create sensor reading |
| `/api/readings/latest` / `/api/sensor-data/latest` | GET | Latest reading (optional `plant_id` filter) |
| `/api/readings` / `/api/sensor-data` | GET | Paginated history with filters |
| `/api/plants/summaries` | GET | Plant summaries |
| `/api/plants/<plant_id>/status` | GET | Plant status |
| `/api/system/status` | GET | System connectivity status |
| `/api/alerts` | GET | Active alerts |

### Data Provider Architecture
The frontend uses a **data provider pattern** (`src/services/api.ts`) to abstract the data source:

```typescript
interface DataProvider {
  mode: 'demo' | 'api'
  getReadings(): Promise<SensorReadingWithMeta[]>
  getPlantSummaries(): Promise<PlantSummary[]>
  getSystemStatus(): Promise<SystemStatus>
  getAlerts(): Promise<AlertItem[]>
  validateCSV(file: File): Promise<CSVValidationResult>
}
```

- **Demo Provider** (`src/services/demoData.ts`): Clearly labeled simulated data for UI development
- **Flask Provider** (`src/services/api.ts`): `createFlaskProvider(baseUrl)` — connects to live Flask API

### Switching Providers
The frontend selects a live provider when `VITE_API_BASE_URL` is set in the environment:

```tsx
import { createFlaskProvider, setDataProvider } from './services/api'

// After user configures API URL
const flaskProvider = createFlaskProvider(import.meta.env.VITE_API_BASE_URL)
setDataProvider(flaskProvider)
```

The UI components use the same `DataProvider` interface — no component changes needed.

**Important**: `VITE_API_BASE_URL` must be the base URL **without** `/api` (e.g., `http://127.0.0.1:5000`). The data provider appends `/api` internally. Do not duplicate the `/api` prefix.

### ProviderSwitcher UI
The `ProviderSwitcher` component (in header) allows users to:
- Enter a Flask API base URL
- Connect and verify connectivity via `/api/health`
- View system health (API, ESP32, Firebase status)
- Disconnect and return to demo mode

## Dashboard Pages Detail

### Overview (`/`)
- Environmental sensor cards (temperature, humidity, soil moisture raw ADC, ambient light raw ADC)
- Plant status summaries with raw NDVI estimate when calibrated reflectance unavailable
- Trend charts for environmental parameters

### Plant Monitoring (`/plants`)
- Plant list with health labels and species
- Click to expand for measurement history table showing raw ADC and raw NDVI estimate

### Optical Sensing (`/optical`)
- Sensing workflow explanation (raw ADC → dark correction → reference calibration → reflectance → NDVI)
- Latest optical record with raw ADC, calibrated reflectance, NDVI, and raw NDVI estimate
- Optical comparison across readings (calibrated only)

### Sensor History (`/history`)
- Timestamped reading table with all available fields
- Optical and environmental views showing raw ADC and raw NDVI estimate

### Alerts (`/alerts`)
- Alert stream with severity badges
- Empty state: "No alerts available."

### Dataset / CSV Inspector (`/data`)
- Browser-local CSV structure inspection
- Column validation, missing cell count, provenance warnings
- Preview of first 5 rows
- Policy: uploaded CSVs remain separate from demo/API readings

### System Status (`/status`)
- API, ESP32, Firebase connectivity states
- Integration readiness notes
- Explicit: "ESP32 connectivity has not been verified."

## Data Integrity Rules (Enforced)
- Calibrated fields (`red_reflectance`, `nir_reflectance`, `ndvi`, `soil_moisture_pct`) are `number | null` — **never default to 0**
- Missing values display as **"Not available"** — never as zero
- NDVI computed **only** when both reflectances are non-null
- Raw ADC counts kept separate from calibrated measurements
- Environmental and spectroscopy datasets kept separate unless compatibility verified
- **Raw NDVI estimate** shown only when calibrated NDVI unavailable, labeled "Raw NDVI Estimate"

## Environment Variables

Create `.env.local` from `.env.example`:

```env
# Flask API base URL (optional - enables live data when set)
# MUST NOT include /api suffix — the data provider appends it
VITE_API_BASE_URL=http://127.0.0.1:5000

# Demo mode (set to 'false' to disable demo data when API is available)
# VITE_DEMO_MODE=true
```

## Running the Frontend

### Development
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Lint & Type Check
```bash
npm run lint
```

## Build Verification

```
✓ TypeScript compilation successful
✓ Vite build successful (385.17 kB JS, 52.44 kB CSS)
✓ ESLint passes (0 errors, 0 warnings)
```

## API Mismatches & Integration Notes

| Aspect | Status | Notes |
|--------|--------|-------|
| Health endpoint | ✅ Matches | `/api/health` returns expected structure |
| Sensor data POST | ✅ Matches | Accepts 24-field schema |
| Sensor data GET (latest) | ✅ Matches | Supports `plant_id` filter |
| Sensor data GET (history) | ✅ Matches | Supports pagination & filters |
| Plant summaries | ✅ Matches | Returns expected shape |
| Plant status | ✅ Matches | Returns latest reading + health |
| System status | ✅ Matches | Honest connectivity states |
| Alerts | ✅ Matches | Returns empty with `generated: false` |
| Duplicate detection | ✅ Works | 409 on duplicate `reading_id` |
| NDVI validation | ✅ Enforced | Rejects NDVI without reflectance |
| Empty DB handling | ✅ Correct | 404 for latest, empty list for history |
| Raw NDVI estimate | ✅ Added | Backend computes, frontend displays when calibrated unavailable |

**Known Limitation**: The backend currently uses in-memory storage by default. For production, configure `STORAGE_BACKEND=supabase` with valid credentials.

## Empty-State Behavior

| Component | Empty State Message |
|-----------|---------------------|
| Overview | "No sensor readings available yet." |
| Plant Monitoring | "No plants found." |
| Optical Sensing | "Calibrated reflectance unavailable" |
| Sensor History | "No readings available." |
| Alerts | "No alerts available." |
| System Status | "unknown" (honest, not fake connected) |

## Design System

- **Colors**: Vikāsa green palette (`vikasa-50` to `vikasa-950`) + neutral grays
- **Typography**: Inter (UI), JetBrains Mono (data)
- **Spacing**: Tailwind default + custom tokens
- **Components**: Consistent card, button, badge, table patterns
- **Accessibility**: Semantic HTML, ARIA labels, focus states, color contrast

## Browser Support

Modern browsers (last 2 versions):
- Chrome/Edge
- Firefox
- Safari
- Mobile Safari/Chrome

## License

Internal use only — Team Nexovate, Bangalore Institute of Technology