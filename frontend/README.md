# Vikāsa Frontend Dashboard

React + TypeScript + Vite frontend for the Vikāsa plant stress monitoring system. The dashboard is a presentation layer for the proposed architecture; it does not claim that hardware, Firebase, or an ML model is connected.

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
│   │   ├── charts/       # TimeSeriesChart, SensorCard, ReflectanceChart
│   │   ├── ui/           # Button, Card, Badge, Table, AlertBanner
│   │   └── forms/        # FileUpload
│   ├── pages/            # Route-level pages
│   │   ├── Overview.tsx
│   │   ├── PlantMonitoring.tsx
│   │   ├── OpticalSensing.tsx
│   │   ├── Trends.tsx
│   │   ├── Alerts.tsx
│   │   ├── DataManagement.tsx
│   │   └── SystemStatus.tsx
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

## Dashboard pages

### Pages
- **Overview** — Environmental sensor cards, plant status summaries, trend charts
- **Plant Monitoring** — Plant/session selection, measurement history tables
- **Optical Sensing** — Red/NIR raw & calibrated reflectance, NDVI, comparison charts
- **Sensor History** — Timestamped reading table
- **Alerts** — Calibration and operational notices
- **Dataset / CSV Inspector** — Browser-local CSV structure inspection with provenance warnings
- **System Status** — Explicit API, ESP32, and Firebase readiness states

### Data architecture
- **Typed interfaces** (`src/types/sensor.ts`) mirror the backend sensor schema.
- **Zod validation** protects CSV inspection and keeps unavailable values undefined.
- **Data provider layer** (`src/services/api.ts`) separates demo data from future Flask API access.
- **TanStack Query** handles loading and retry states.
- **Demo data** is always labeled and never presented as a hardware measurement.

### Data Integrity Rules (Enforced)
- Calibrated fields (`red_reflectance`, `nir_reflectance`, `ndvi`, `soil_moisture_pct`) are `number | null` — **never default to 0**
- Missing values display as **"Not available"** — never as zero
- NDVI computed **only** when both reflectances are non-null
- Raw ADC counts kept separate from calibrated measurements
- Environmental and spectroscopy datasets kept separate unless compatibility verified

## Switching to Flask API

The frontend selects a live provider when `VITE_API_BASE_URL` is set. Otherwise it uses the clearly labeled demo provider:

```tsx
import { createFlaskProvider, setDataProvider } from './services/api'

// After user login or config
const flaskProvider = createFlaskProvider(import.meta.env.VITE_API_BASE_URL)
setDataProvider(flaskProvider)
```

The UI components use the same `DataProvider` interface — no component changes needed.

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

## Environment Variables

None required for demo mode. For future Flask API integration:

```env
VITE_API_BASE_URL=http://localhost:5000
```

The current Flask backend exposes sensor ingestion and storage routes, but the dashboard summary endpoints are still a separate integration task. A configured API provider may therefore require matching backend routes before live data appears.

## CSV inspection and integrity

The Dataset / CSV Inspector reads a selected file in the browser and reports file columns, row count, missing cells, schema gaps, and provenance warnings. It does not merge CSV rows into demo/API readings. The repository CSV template contains headers only.

Raw red/NIR ADC counts are displayed separately from calibrated reflectance. NDVI is shown only when both calibrated reflectance values are present; it is never calculated from raw ADC counts.

## License

Internal use only — Team Nexovate, Bangalore Institute of Technology