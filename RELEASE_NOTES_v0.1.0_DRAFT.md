# Vikāsa v0.1.0 — Draft Release Notes (Corrected)

> **Status**: Draft for internal review only. Not published.
>
> **Repository**: `https://github.com/uknowme-123/Vikasa`
>
> **Commits**: `9c78be2` (prepare repository for public release), `f43b59c` (align license metadata to MIT)
>
> **Base commit**: `258cecc` (origin/main)

---

## Project Overview

**Vikāsa** is a plant-health monitoring system developed by **Team Nexovate** at **Bangalore Institute of Technology**. It implements a complete data pipeline for non-invasive optical plant stress monitoring:

```
ESP32-C3 → Wi-Fi → Flask REST API → Supabase/Firebase PostgreSQL → React/TypeScript Dashboard
```

The system combines red and near-infrared (NIR) optical sensing via ADS1115 ADC, environmental sensors (DHT22, soil moisture, ambient light), an ESP32-C3 edge device, a validated Flask REST API with pluggable storage backends, and a live-updating React dashboard.

**This release represents a working implementation of the data pipeline (software only).** Hardware calibration, physical sensor validation, ML inference, alerting, and authentication remain documented future work.

---

## Features Included

### 1. ESP32-C3 Firmware (`hardware/firmware/`)
- **Sensor acquisition**: ADS1115 (4 single-ended channels) for red/NIR optical measurements; DHT22 for temperature/humidity; ADC for soil moisture and ambient light
- **Optical measurement pipeline**: Dark correction → reference calibration → reflectance computation → NDVI (from calibrated reflectance only)
- **Deterministic reading IDs**: `VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}` (enables backend duplicate detection)
- **NTP time synchronization**: Explicit `UNSYNCED` state when time is not plausible; never creates false timestamps
- **HTTP/JSON client**: POSTs to `/api/sensor-data` with bounded retry logic (max 3 retries, no uncontrolled loops)
- **Development mode**: `DEVELOPMENT_MODE=1` enables stub drivers, verbose logging, and `test_only: true` payloads
- **Secrets management**: All credentials via `config/secrets.h` (gitignored); template at `config/secrets.example.h`
- **Build targets**: `glyph_c3` (release), `glyph_c3-dev` (development); compiles on ESP32-C3 board `glyph_c3` (ESP32-C3-MINI-1-N4, 4 MB flash)
- **Unit tests**: 29 tests written (reading ID generation, sensor data validation, JSON serialization, configuration validation, HTTP status handling, retry behavior, optical data rules); native test environment requires PlatformIO host-runner configuration

### 2. Flask REST API (`backend/`)
- **Schema validation**: 24-field Pydantic schema (`backend/app/schemas/sensor.py`) — source of truth for sensor contract
- **Raw NDVI estimate**: Computed field `(nir_raw - red_raw) / (nir_raw + red_raw)` from ADC counts (not stored, not calibrated NDVI)
- **NDVI enforcement**: Calibrated `ndvi` accepted only when both `red_reflectance` and `nir_reflectance` are provided (pairwise requirement)
- **Timestamp validation**: Rejects timestamps older than 1 year or >5 min in the future
- **Storage abstraction**: Three swappable backends via `StorageService` interface:
  - **In-memory** (`STORAGE_BACKEND=memory`) — default, non-persistent, for development/testing
  - **Supabase** (`STORAGE_BACKEND=supabase` + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — PostgreSQL with RLS via `supabase-py` (`supabase>=2.0.0`), production
  - **Firebase** (`STORAGE_BACKEND=firebase` + credentials) — Realtime Database via `firebase-admin`, legacy/alternative
- **REST endpoints**:
  - `GET /api/health` — backend + storage health
  - `POST /api/readings` (alias `/api/sensor-data`) — create reading
  - `GET /api/readings/latest` (alias `/api/sensor-data/latest`) — latest reading, optional `plant_id` filter
  - `GET /api/readings` (alias `/api/sensor-data`) — paginated history with filters
  - `GET /api/plants/<plant_id>/status` — plant status + latest reading
  - `GET /api/plants/summaries` — per-plant summaries
  - `GET /api/system/status` — connectivity status (honest: `esp32: "unknown"`, `firebase: "unknown"`)
  - `GET /api/alerts` — alert history (empty, `generated: false`)
- **Duplicate detection**: Returns 409 on duplicate `reading_id`
- **Test suite**: 57 tests pass with `STORAGE_BACKEND=memory` (29 Supabase storage mock tests, 14 API tests, 14 Firebase storage mock tests)

### 3. React/TypeScript Dashboard (`frontend/`)
- **Framework**: React 18 + TypeScript + Vite + Tailwind CSS
- **10-second polling**: TanStack Query `refetchInterval: 10_000` on `/api/readings`
- **Data provider pattern**: Swappable demo ↔ Flask API via `VITE_API_BASE_URL`
- **Pages**:
  - Overview — environmental cards, plant summaries, trend charts
  - Plant Monitoring — plant/session selection, measurement history
  - Optical Sensing — raw ADC, calibrated reflectance, NDVI, raw NDVI estimate, comparison
  - Sensor History — timestamped table with all fields
  - Alerts — empty state with severity badges
  - Dataset / CSV Inspector — browser-local validation, provenance warnings
  - System Status — API/ESP32/Firebase readiness (explicit "not verified" labels)
- **Data integrity rules**:
  - Calibrated fields (`red_reflectance`, `nir_reflectance`, `ndvi`, `soil_moisture_pct`) are `number | null` — never default to 0
  - Missing values display as "Not available"
  - NDVI computed only when both reflectances non-null
  - Raw ADC kept separate from calibrated measurements
  - Raw NDVI estimate shown only when calibrated NDVI unavailable, labeled "Raw NDVI Estimate"
- **ProviderSwitcher UI**: Connect/disconnect Flask API, verify `/api/health`, view system status
- **Build verification**: TypeScript compiles, Vite builds (385.17 kB JS, 52.44 kB CSS), ESLint 0 errors/0 warnings

### 4. Supabase Integration (Backend Only)
- **Storage backend**: PostgreSQL with Row-Level Security via `supabase-py` client (`supabase>=2.0.0` in `requirements.txt`)
- **Configuration**: Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`) in backend `.env`
- **Schema**: Matches backend sensor schema; table `public.readings`; migrations managed manually (no migration tooling yet)
- **Tests**: 14 unit tests using local fluent-client fake; no Supabase project, credentials, or network access required

### 5. CI/CD (`.github/workflows/ci.yml`)
- **Backend tests**: Python 3.11, `pytest backend/tests/` with `STORAGE_BACKEND=memory`
- **Frontend build & lint**: Node 20, `npm ci`, `npm run build`, `npm run lint`
- **Firmware compile**: PlatformIO, `pio run -e glyph_c3` and `pio run -e glyph_c3-dev`
- **Git hygiene**: `git diff --check` on every PR/push

---

## Setup & Configuration

### Backend
```bash
cd W:\Vikasa
pip install -r requirements.txt
pip install -e .[dev]
cd backend
cp .env.example .env
# Edit .env: set STORAGE_BACKEND=memory for dev, or configure Supabase/Firebase
STORAGE_BACKEND=memory python -m backend.app
```
API runs at `http://127.0.0.1:5000` (endpoints under `/api/`).

> **Note**: `requirements.txt` is at the repository root, not in `backend/`.

### Frontend
```bash
cd W:\Vikasa\frontend
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://127.0.0.1:5000 (no /api suffix)
npm run dev
```
Dev server at `http://localhost:5173`.

### Firmware (ESP32-C3)
```bash
cd W:\Vikasa\hardware\firmware
cp config/secrets.example.h config/secrets.h
# Edit config/secrets.h with Wi-Fi credentials, API base URL, device IDs
pio run -e glyph_c3-dev   # Development build (DEVELOPMENT_MODE=1)
pio run -e glyph_c3       # Release build
# pio test -e native-test  # Unit tests (requires native platform config)
```

### API Base URL Conventions
| Component | Base URL Format | Notes |
|-----------|-----------------|-------|
| Frontend | `http://127.0.0.1:5000` | Data provider appends `/api` internally |
| Firmware | `http://127.0.0.1:5000/api` | Firmware includes `/api` in configured `API_BASE_URL` |

---

## Verification Status — Evidence-Based

| Claim | Status | Evidence |
|-------|--------|----------|
| **57 backend tests pass** | ✅ Verified | `STORAGE_BACKEND=memory pytest backend/tests/` → 57 passed |
| **Frontend TypeScript build** | ✅ Verified | `npm run build` → 385.17 kB JS, 52.44 kB CSS |
| **Frontend ESLint** | ✅ Verified | `npm run lint` → 0 errors, 0 warnings |
| **Firmware compiles (release)** | ✅ Verified | `pio run -e glyph_c3` → SUCCESS (FIRMWARE_FINAL_REPORT.md) |
| **Firmware compiles (dev)** | ✅ Verified | `pio run -e glyph_c3-dev` → compiles with `DEVELOPMENT_MODE=1` |
| **Git diff --check** | ✅ Verified | No whitespace errors |
| **Supabase uses supabase-py** | ✅ Verified | `backend/app/services/supabase_storage.py` imports `supabase` via `import_module` |
| **Frontend uses Flask API only** | ✅ Verified | `frontend/package.json` has no supabase dependency; data provider calls Flask endpoints |
| **10-second polling** | ✅ Verified | `frontend/src/hooks/useSensorData.ts`: `refetchInterval: 10_000` |
| **Raw NDVI estimate computed** | ✅ Verified | `backend/app/schemas/sensor.py` computed field |
| **NDVI requires reflectance** | ✅ Verified | Schema validation in `backend/app/schemas/sensor.py` |
| **Hardware calibration validated** | ❌ Not done | `docs/firmware.md` §15, `hardware/README.md`: "No physical board, circuit, or enclosure has been validated" |
| **ESP32 physical operation verified** | ❌ Not done | `/api/system/status` reports `esp32: "unknown"`; no CI hardware verification |
| **ML inference operational** | ❌ Not done | `ml/README.md`: "No trained model files, tested accuracy claims, or production inference results" |
| **Alert generation implemented** | ❌ Not done | `/api/alerts` returns empty with `generated: false` |
| **Authentication implemented** | ❌ Not done | Backend README: "No authentication is implemented" |
| **Supabase integration tested live** | ❌ Not done | Unit tests mock client; integration requires credentials |

---

## Known Limitations

1. **In-memory storage (default)**: Not persistent across restarts. Configure `STORAGE_BACKEND=supabase` with valid credentials for persistence.
2. **No authentication**: Development only. Production requires API keys, JWT, or mTLS.
3. **ESP32 connectivity not verified**: `/api/system/status` reports `esp32: "unknown"` honestly; no CI verification of hardware connectivity.
4. **Alert generation not implemented**: `/api/alerts` returns empty list with `generated: false`; Telegram integration not connected.
5. **Raw NDVI estimate ≠ calibrated NDVI**: Do not use `raw_ndvi_estimate` for plant health decisions.
6. **Calibration pending**: Physical ADS1115 + transimpedance amplifier circuit, LED driver, reference standard (Spectralon), and reflectance linearity not yet validated.
7. **ML pipeline not connected**: No TinyML inference or model scoring; `ml/` directory contains scaffolding only.
8. **Database migrations**: No migration management for Supabase schema changes.
9. **Production Supabase/Firebase**: Requires valid credentials and schema deployment (not included in repo).

---

## Licensing

This project is distributed under the **MIT License** (see `LICENSE`).

| File | License Reference | Status |
|------|-------------------|--------|
| `LICENSE` | MIT License, Copyright (c) 2026 Rajeev C | ✅ Consistent |
| `pyproject.toml` | `license = {text = "MIT"}` | ✅ Consistent |
| `frontend/README.md` | "This project is distributed under the MIT License. See the root [LICENSE](../LICENSE) file for details." | ✅ Consistent |
| `backend/README.md` | No explicit license text; references storage abstraction | ✅ Consistent (no conflict) |
| `frontend/README.md` | "This project is distributed under the MIT License. See the root [LICENSE](../LICENSE) file for details." | ✅ Consistent |
| `hardware/README.md` | No license text | ✅ No conflict |
| `data/README.md` | No license text | ✅ No conflict |
| `ml/README.md` | No license text | ✅ No conflict |

**Action required**: License inconsistency in `frontend/README.md` has been corrected in this draft.

---

## Documentation Gaps (Fix Before Publication)

| Gap | Location | Suggested Fix |
|-----|----------|---------------|
| **Institutional approval** | Root README, docs | Add explicit statement: "Release authorized by Bangalore Institute of Technology / Team Nexovate" or remove institutional branding if unauthorized |
| **Contributor consent** | `AUTHORS`/`CONTRIBUTORS` file | Add `AUTHORS.md` or `CONTRIBUTORS.md` with consent records |
| **Supabase credential revocation** | Security docs | Document independent verification of old credential revocation, or add `SECURITY.md` with rotation procedure |
| **Hardware BOM & schematics** | `hardware/README.md`, `docs/hardware_setup.md` | Publish bill of materials, wiring diagrams, PCB files (or mark as "not yet published") |
| **Calibration procedure** | `docs/firmware.md` §15, `docs/data_collection_protocol.md` | Document step-by-step calibration with reference standard |
| **ML pipeline readiness** | `docs/ml_readiness.md`, `docs/ml_workflow.md` | Clarify current state: scaffolding only, no trained models |
| **Deployment guide** | Missing | Add `docs/deployment.md` for production Supabase, reverse proxy, TLS, monitoring |
| **Changelog** | Missing | Add `CHANGELOG.md` with versioned entries (Keep a Changelog format) |
| **Code of conduct** | Missing | Add `CODE_OF_CONDUCT.md` (Contributor Covenant) for public repo |
| **Security policy** | Missing | Add `SECURITY.md` with vulnerability reporting process |
| **Firmware build target names** | `docs/firmware.md` §13 | ✅ Updated to `glyph_c3`/`glyph_c3-dev` |
| **Backend requirements location** | Root README, backend README | ✅ Clarified `requirements.txt` is at repository root |

---

## What Users Must Configure

> **Never committed to the repository** — users must provide their own:

| Component | File (gitignored) | Required Values |
|-----------|-------------------|-----------------|
| Backend | `backend/.env` | `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or Firebase creds), `CORS_ORIGIN` |
| Frontend | `frontend/.env.local` | `VITE_API_BASE_URL` (optional — demo mode works without) |
| Firmware | `hardware/firmware/config/secrets.h` | `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL`, `DEVICE_PLANT_ID`, `DEVICE_SESSION_ID`, `DEVICE_OPERATOR_ID` |

Example `.env` and `secrets.example.h` templates are provided in the repo.

---

## Release Blockers (Governance)

| Blocker | Status | Required Resolution |
|---------|--------|---------------------|
| **Supabase credential revocation independently verified** | ❌ **Not verified** | Obtain and document independent confirmation that the previously exposed credential was revoked and rotated |
| **Institutional release approval documented** | ❌ **Not documented** | Written approval from Bangalore Institute of Technology / Team Nexovate leadership |
| **Contributor consent for public distribution** | ❌ **Not documented** | Signed/recorded consent from all contributors |
| **License consistency** | ✅ **Fixed** | `frontend/README.md` updated to MIT reference |

---

## Disclaimer

> This release draft does **not** constitute institutional approval for public release. The previously exposed Supabase credential revocation has **not been independently verified**. Contributor consent for public distribution has **not been documented**. These governance items must be resolved before publishing a GitHub Release or changing repository visibility.

---

*Draft prepared for internal review. Do not publish without resolving documentation gaps and governance gates.*