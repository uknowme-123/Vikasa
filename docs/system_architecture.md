# System Architecture

This document describes the **implemented** Vikāsa architecture and the responsibilities of each subsystem.

## System overview

Vikāsa monitors plant stress through non-invasive optical measurements. The implemented pipeline connects an ESP32-C3 sensing node, a Flask REST API, Supabase/Firebase storage, and a React dashboard.

## Component roles

### 1. ESP32-C3 edge node (firmware in `hardware/firmware/`)
- Reads optical sensors via ADS1115 (red/NIR channels, dark/reference/sample sequence)
- Reads environmental sensors (DHT22 temperature/humidity, soil moisture ADC, ambient light ADC)
- Performs dark correction and reference calibration to compute reflectance percentages
- Generates deterministic reading IDs: `VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}`
- Synchronizes time via NTP with explicit `UNSYNCED` state when time is not plausible
- POSTs validated JSON payloads to `POST /api/sensor-data` with retry logic (bounded retries, no uncontrolled loops)
- **Does NOT** infer health labels, stress types, or classifications

### 2. Flask REST API (backend in `backend/`)
- Validates incoming sensor data against 24-field Pydantic schema (`backend/app/schemas/sensor.py`)
- Computes `raw_ndvi_estimate` from raw ADC counts as a computed field (not stored)
- Enforces: NDVI requires both calibrated reflectance values; pairwise reflectance requirement
- Rejects timestamps older than 1 year or in the future (>5 min)
- Storage abstraction: in-memory (dev), Supabase (production), Firebase (legacy)
- Exposes REST endpoints: readings CRUD, plant summaries, system status, alerts
- Duplicate detection on `reading_id` (returns 409)
- Honest system status: reports `esp32: "unknown"`, `firebase: "unknown"`

### 3. Supabase/Firebase storage
- **Supabase** (default production): PostgreSQL with row-level security, async client
- **Firebase** (legacy): Realtime Database with idempotent transaction writes
- **In-memory** (default dev): Non-persistent, cleared on restart
- All backends implement `StorageService` interface for swapability

### 4. React/TypeScript dashboard (frontend in `frontend/`)
- Polls `/api/readings` every **10 seconds** via TanStack Query (`refetchInterval: 10_000`)
- Data provider pattern: demo ↔ Flask API (switched via `VITE_API_BASE_URL`)
- Displays raw ADC, calibrated reflectance, raw NDVI estimate, and environmental trends
- Clear labeling: "Raw NDVI Estimate" vs "NDVI", "Soil moisture raw ADC" vs calibrated %
- Empty states show "Not available" — never zero
- CSV inspector for browser-local file validation (provenance warnings)

## Implemented data flow

```text
Plant canopy
    → ESP32-C3: ADS1115 (red/NIR raw, dark, reference) + DHT22 + soil moisture + ambient light
    → Firmware: dark correction → reflectance calibration → deterministic reading_id → NTP timestamp
    → HTTP POST /api/sensor-data (JSON, retry on 5xx/timeout, single retry on 409)
    → Flask API: Pydantic validation → raw_ndvi_estimate computed → storage backend
    → Supabase/Firebase/memory: persistent or ephemeral storage
    → React dashboard: 10s polling → TanStack Query → UI components
```

## Key architectural decisions

| Decision | Implementation |
|----------|----------------|
| Raw vs calibrated | Stored separately; `raw_ndvi_estimate` computed from ADC, never conflated with calibrated `ndvi` |
| Timestamp handling | Explicit `UNSYNCED` state; backend rejects implausible timestamps |
| Reading ID | Deterministic, device-generated; enables duplicate detection |
| Storage abstraction | Interface-based; swap memory/Supabase/Firebase via config |
| Polling interval | 10 seconds (frontend), configurable via `refetchInterval` |
| API base URL | Frontend: `http://127.0.0.1:5000` (no `/api`); Firmware: `http://127.0.0.1:5000/api` |
| Secrets | Never committed; `secrets.h` (firmware), `.env` (backend) gitignored |

## Verified implementation status

| Component | Status | Notes |
|-----------|--------|-------|
| ESP32 firmware | ✅ Compiles | `pio run -e glyph_c3` and `glyph_c3-dev` succeed |
| Flask API | ✅ Tests pass | 57/57 tests pass with `STORAGE_BACKEND=memory` |
| Supabase storage | ✅ Tests pass | Unit tests mock client; integration requires credentials |
| Firebase storage | ✅ Tests pass | Unit tests mock firebase_admin |
| React dashboard | ✅ Build passes | `npm run build` and `npm run lint` pass |
| Dashboard polling | ✅ Verified | 10s interval confirmed in browser Network tab |
| Raw NDVI estimate | ✅ Implemented | Backend computed field, frontend displays when calibrated unavailable |

## Unverified / future work

The following items remain unverified or unimplemented:

- **Hardware calibration**: Physical ADS1115 + transimpedance amplifier circuit, LED driver, reference standard (Spectralon), reflectance linearity not yet validated
- **Optical measurement accuracy**: Dark current stability, temperature compensation, long-term drift not characterized
- **ML inference**: No TinyML model deployed on ESP32 or server-side; `ml/` directory contains pipeline scaffolding only
- **Alert generation**: `/api/alerts` returns empty with `generated: false`; Telegram integration not connected
- **Authentication**: No auth on API endpoints; development only
- **ESP32 connectivity**: Not verified in CI; `/api/system/status` honestly reports `unknown`
- **Production Supabase/Firebase**: Requires valid credentials and schema migration

## Development outlook

1. **Hardware validation** — Complete analog front-end, reference standard, calibration procedure
2. **Optical characterization** — Linearity, temperature compensation, drift, accuracy vs known samples
3. **ML pipeline** — Label collection, preprocessing, feature engineering, model training, export
4. **Edge inference** — Deploy TinyML model to ESP32-C3 (if feasible) or server-side scoring
5. **Alerting** — Threshold configuration, Telegram integration, alert persistence
6. **Authentication** — API keys, JWT, or mTLS for production
7. **Observability** — Structured logging, metrics, distributed tracing

## Notes

This architecture reflects the **currently working implementation**. The hardware calibration, ML inference, and alerting are documented future work. Any circuit details, sensor choices, or model claims should be treated as preliminary until formally validated.