# Vikāsa Frontend Dashboard

React + TypeScript + Vite frontend for the Vikāsa plant stress monitoring system.

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

## Key Features

### Pages
- **Overview** — Environmental sensor cards, plant status summaries, trend charts
- **Plant Monitoring** — Plant/session selection, measurement history tables
- **Optical Sensing** — Red/NIR raw & calibrated reflectance, NDVI, comparison charts
- **Trends** — Historical time-series for environmental & optical data
- **Alerts** — Threshold alerts, connectivity warnings, calibration notices
- **Data Management** — CSV upload/validation with schema checking, dataset separation
- **System Status** — API, ESP32, Firebase, Telegram connectivity simulation

### Data Architecture
- **Typed interfaces** (`types/sensor.ts`) match the CSV schema exactly
- **Zod validation** for runtime CSV parsing
- **Data provider layer** (`services/api.ts`) — swap demo for Flask API without UI changes
- **TanStack Query** for caching, stale-while-revalidate, background refetching
- **Demo data** clearly labeled with badges and warnings

### Data Integrity Rules (Enforced)
- Calibrated fields (`red_reflectance`, `nir_reflectance`, `ndvi`, `soil_moisture_pct`) are `number | null` — **never default to 0**
- Missing values display as **"Not available"** — never as zero
- NDVI computed **only** when both reflectances are non-null
- Raw ADC counts kept separate from calibrated measurements
- Environmental and spectroscopy datasets kept separate unless compatibility verified

## Switching to Flask API

When the backend is ready, replace the data provider in `main.tsx` or `App.tsx`:

```tsx
import { createFlaskProvider, setDataProvider } from './services/api'

// After user login or config
const flaskProvider = await createFlaskProvider('http://localhost:5000')
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

None required for demo mode. For Flask API integration:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## License

Internal use only — Team Nexovate, Bangalore Institute of Technology