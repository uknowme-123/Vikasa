# Vikāsa

Vikāsa is a plant-health monitoring system for Team Nexovate at Bangalore Institute of Technology. It combines red and near-infrared (NIR) optical sensing, a raw NDVI estimate from ADC counts, environmental sensors, an ESP32-C3 edge device, a Flask REST API, Supabase/Firebase storage, and a React/TypeScript dashboard.

## System architecture

```
ESP32-C3 → Wi-Fi → Flask REST API → Supabase/Firebase PostgreSQL → React dashboard
```

**Implemented components:**
- **ESP32-C3 firmware**: Reads optical (ADS1115) and environmental sensors, generates deterministic reading IDs, synchronizes time via NTP (with explicit UNSYNCED state), POSTs JSON to `/api/sensor-data`
- **Flask backend**: Validates 24-field sensor schema, stores readings in memory/Supabase/Firebase, exposes REST endpoints for readings, plant summaries, system status, and alerts
- **Supabase storage**: Persistent PostgreSQL backend with row-level security (production)
- **React dashboard**: Polls `/api/readings` every 10 seconds, displays raw ADC, calibrated reflectance, raw NDVI estimate, and environmental trends

## Responsibilities

| Component | Responsibility |
|-----------|----------------|
| ESP32-C3 | Sensor acquisition (ADS1115 optical, DHT22, soil moisture, ambient light), dark/reference calibration, deterministic reading IDs, NTP time sync, HTTP POST to Flask API |
| Flask API | Request validation (Pydantic), storage abstraction (memory/Supabase/Firebase), REST endpoints, duplicate detection, timestamp validation |
| Supabase/Firebase | Persistent storage, queries, health checks |
| React dashboard | 10-second polling via TanStack Query, data provider pattern (demo ↔ API), raw vs calibrated distinction, trend charts, CSV inspection |

## Local setup and startup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set STORAGE_BACKEND=memory for local dev, or configure Supabase/Firebase
python -m backend.app
```

The API runs at `http://127.0.0.1:5000`. Endpoints are under `/api/` (e.g., `/api/readings`, `/api/health`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://127.0.0.1:5000 (no /api suffix)
npm run dev
```

The development server runs at `http://localhost:5173`.

### Firmware (ESP32-C3)

```bash
cd hardware/firmware
cp config/secrets.example.h config/secrets.h
# Edit config/secrets.h with Wi-Fi credentials, API base URL, device IDs
pio run -e glyph_c3-dev  # Development build with DEVELOPMENT_MODE=1
pio run -e glyph_c3      # Release build
pio test -e native-test  # Unit tests (native)
```

## API configuration

- **API base URL** (frontend): `http://127.0.0.1:5000` — the frontend appends `/api` internally
- **API base URL** (firmware): `http://127.0.0.1:5000/api` — firmware includes `/api` in its configured `API_BASE_URL`
- Do **not** duplicate `/api` in frontend requests; the data provider handles it

### Key endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Backend and storage health |
| `/api/readings` | POST | Create sensor reading (alias: `/api/sensor-data`) |
| `/api/readings/latest` | GET | Latest reading (optional `plant_id`) |
| `/api/readings` | GET | Paginated history with filters |
| `/api/plants/summaries` | GET | Per-plant summaries |
| `/api/plants/<plant_id>/status` | GET | Plant status + latest reading |
| `/api/system/status` | GET | System connectivity (honest about unverified hardware) |
| `/api/alerts` | GET | Alert history (currently empty, `generated: false`) |

## Dashboard 10-second refresh

The dashboard polls `/api/readings` every **10 seconds** via `useReadings` hook (`refetchInterval: 10_000`). To verify:
1. Start backend and frontend
2. Open browser dev tools → Network tab
3. Observe repeated `GET /api/readings` requests every 10s
4. Timestamp on displayed readings advances as new data arrives

## Sensor data contract

The schema in `backend/app/schemas/sensor.py` is the source of truth. Key fields:

```json
{
  "reading_id": "VIKASA-PLANT-001-1700000000000-001",
  "plant_id": "PLANT-001",
  "session_id": "SESSION-2026-001",
  "timestamp": "2026-10-04T12:00:00Z",
  "operator_id": "OPERATOR-001",
  "red_raw": 2100,
  "nir_raw": 3200,
  "red_reflectance": 54.2,
  "nir_reflectance": 79.8,
  "ndvi": 0.191,
  "raw_ndvi_estimate": 0.208,
  "temperature_c": 24.5,
  "humidity_pct": 62.3,
  "soil_moisture_raw": 1850,
  "ambient_light_raw": 2900
}
```

### Raw NDVI estimate

- `raw_ndvi_estimate = (nir_raw - red_raw) / (nir_raw + red_raw)` when both raw ADC values are present
- Computed automatically by backend schema as a **computed field** (not stored)
- **Not calibrated NDVI** — useful for debugging signal direction only
- Calibrated `ndvi` requires both `red_reflectance` and `nir_reflectance`

### Fields that may be null

All optical, environmental, and calibration fields are optional. Missing values are `null` — never defaulted to 0. The dashboard displays "Not available" for null fields.

## Build, test, and verify

### Frontend

```bash
cd frontend
npm run build      # TypeScript + Vite production build
npm run lint       # ESLint (must pass with 0 errors, 0 warnings)
npm run preview    # Preview production build
```

### Backend

```bash
cd backend
STORAGE_BACKEND=memory pytest backend/tests/ -v
# All 57 tests should pass
```

### Firmware

```bash
cd hardware/firmware
pio run -e glyph_c3      # Release build
pio run -e glyph_c3-dev  # Development build
# pio test -e native-test  # Requires native platform config
```

### Git hygiene

```bash
git diff --check   # No whitespace errors
git status         # Only intended changes staged
```

## Known limitations

- **In-memory storage** (default): Not persistent across restarts. Use `STORAGE_BACKEND=supabase` with valid credentials for persistence.
- **No authentication**: Development only. Production requires auth.
- **ESP32 connectivity not verified**: `/api/system/status` reports `esp32: "unknown"` honestly.
- **Alert generation not implemented**: Returns empty list with `generated: false`.
- **Raw NDVI estimate ≠ calibrated NDVI**: Do not use `raw_ndvi_estimate` for plant health decisions.
- **Calibration pending**: Physical ADS1115 + AFE circuit, reference standard, and reflectance linearity not yet validated.
- **ML pipeline not connected**: No TinyML inference or model scoring in current implementation.

## Documentation index

- [docs/api_documentation.md](docs/api_documentation.md) — Implemented API reference
- [docs/api.md](docs/api.md) — Detailed endpoint documentation with examples
- [docs/frontend.md](docs/frontend.md) — Dashboard architecture and integration
- [docs/firmware.md](docs/firmware.md) — ESP32-C3 firmware details
- [docs/system_architecture.md](docs/system_architecture.md) — System architecture (updated to reflect implementation)
- [docs/hardware_setup.md](docs/hardware_setup.md)
- [docs/firebase_setup.md](docs/firebase_setup.md)
- [docs/data_collection_protocol.md](docs/data_collection_protocol.md)

## Notes

This repository contains a **working implementation** of the data pipeline (ESP32 → Flask → Supabase → Dashboard). The hardware calibration, ML inference, and alerting remain as documented future work. Any circuit details, sensor choices, or model claims should be treated as preliminary until formally validated.