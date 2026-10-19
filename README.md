# Vikāsa

Vikāsa is a plant-health monitoring system developed by **Team Nexovate** at **Bangalore Institute of Technology**. It implements a complete data pipeline for non-invasive optical plant stress monitoring using red and near-infrared (NIR) reflectance measurements.

```
ESP32-C3 → Wi-Fi → Flask REST API → Supabase/Firebase PostgreSQL → React/TypeScript Dashboard
```

## System Overview

| Component | Technology | Status |
|-----------|------------|--------|
| **Edge Device** | ESP32-C3 (PCB CUPID GLYPH C3) | Firmware compiles ✅ |
| **Sensors** | ADS1115 (optical), DHT22, Soil moisture ADC, Ambient light ADC | Drivers implemented ✅ |
| **API** | Flask + Pydantic validation | 57 tests pass ✅ |
| **Storage** | Pluggable: In-memory (dev), Supabase (prod), Firebase (legacy) | Implemented ✅ |
| **Dashboard** | React 18 + TypeScript + Vite + Tailwind + TanStack Query | Build passes ✅ |
| **CI/CD** | GitHub Actions (backend, frontend, firmware) | Configured ✅ |

## Key Features

- **Optical measurement pipeline**: Dark correction → reference calibration → reflectance → NDVI (from calibrated reflectance only)
- **Deterministic reading IDs**: `VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}` enables backend duplicate detection
- **NTP time synchronization**: Explicit `UNSYNCED` state when time is not plausible; never fabricates timestamps
- **HTTP/JSON client**: POSTs to `/api/sensor-data` with bounded retry logic (max 3 retries, no uncontrolled loops)
- **Development mode**: `DEVELOPMENT_MODE=1` enables stub drivers, verbose logging, and `test_only: true` payloads
- **Secrets management**: All credentials via `config/secrets.h` (gitignored); template at `config/secrets.example.h`
- **Raw vs calibrated separation**: Raw ADC counts stored separately from calibrated reflectance/NDVI; `raw_ndvi_estimate` computed from ADC for debugging only

## Hardware Components

| Sensor | Interface | Pin / Channel | Notes |
|--------|-----------|---------------|-------|
| Red optical (660 nm) | BPW34 + AFE → ADS1115 | AIN0 | Time-multiplexed with reference |
| NIR optical (940 nm) | BPW34 + AFE → ADS1115 | AIN1 | Time-multiplexed with reference |
| Red dark | BPW34 + AFE → ADS1115 | AIN2 | Shared with soil moisture |
| NIR dark | BPW34 + AFE → ADS1115 | AIN3 | Shared with ambient light |
| DHT22 (temp/humidity) | GPIO (1-Wire) | GPIO10 | |
| Soil moisture | ESP32 ADC / ADS1115 | GPIO2 / AIN2 | Default: ESP32 ADC |
| Ambient light (LDR) | ESP32 ADC / ADS1115 | GPIO3 / AIN3 | Default: ESP32 ADC |
| Red LED | GPIO | GPIO6 | Active illumination |
| NIR LED | GPIO | GPIO7 | Active illumination |
| I2C (ADS1115) | SDA/SCL | GPIO4 / GPIO5 | 400 kHz |

**ADS1115 constraints**: Only 4 single-ended channels. Reference measurements reuse sample channels (AIN0/AIN1) at different times. Soil/ambient on ADS1115 would share dark channels — current defaults use ESP32 ADC to avoid conflicts.

## Quick Start

### Backend (Flask API)
```bash
# From repository root
pip install -r requirements.txt
pip install -e .[dev]

cd backend
cp .env.example .env
# Edit .env: set STORAGE_BACKEND=memory for local dev, or configure Supabase/Firebase
STORAGE_BACKEND=memory python -m backend.app
```
API runs at `http://127.0.0.1:5000` (endpoints under `/api/`).

### Frontend (React Dashboard)
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://127.0.0.1:5000 (no /api suffix)
npm run dev
```
Dev server at `http://localhost:5173`.

### Firmware (ESP32-C3)
```bash
cd hardware/firmware
cp config/secrets.example.h config/secrets.h
# Edit config/secrets.h with Wi-Fi credentials, API base URL, device IDs
pio run -e glyph_c3-dev   # Development build (DEVELOPMENT_MODE=1)
pio run -e glyph_c3       # Release build
pio test -e native-test   # Unit tests (native)
```

### API Base URL Conventions
| Component | Base URL Format | Notes |
|-----------|-----------------|-------|
| Frontend | `http://127.0.0.1:5000` | Data provider appends `/api` internally |
| Firmware | `http://127.0.0.1:5000/api` | Firmware includes `/api` in configured `API_BASE_URL` |

## Sensor Data Contract

The schema in `backend/app/schemas/sensor.py` is the source of truth (24 columns matching `data/raw/hardware/vikasa_sensor_data_template.csv`).

```json
{
  "reading_id": "VIKASA-PLANT-001-1700000000000-001",
  "plant_id": "PLANT-001",
  "session_id": "SESSION-2026-001",
  "timestamp": "2026-10-04T12:00:00Z",
  "operator_id": "OPERATOR-001",
  "red_raw": 2100,
  "nir_raw": 3200,
  "red_dark": 45,
  "nir_dark": 52,
  "red_reference": 3800,
  "nir_reference": 3950,
  "red_reflectance": 54.2,
  "nir_reflectance": 79.8,
  "ndvi": 0.191,
  "raw_ndvi_estimate": 0.208,
  "temperature_c": 24.5,
  "humidity_pct": 62.3,
  "soil_moisture_raw": 1850,
  "soil_moisture_pct": 42.1,
  "ambient_light_raw": 2900
}
```

### Critical Rules
- **Raw ADC ≠ Reflectance**: `red_raw`, `nir_raw` are uncalibrated ADC counts (0–65535)
- **NDVI from calibrated reflectance only**: `ndvi` requires both `red_reflectance` and `nir_reflectance`
- **Raw NDVI estimate**: `(nir_raw - red_raw) / (nir_raw + red_raw)` — computed field for debugging only
- **No label inference**: Device never sets `health_label`, `stress_type`, or `label_evidence`
- **Missing = null**: Unmeasured fields are `null`, never defaulted to 0

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Backend + storage health |
| `/api/readings` | POST | Create reading (alias: `/api/sensor-data`) |
| `/api/readings/latest` | GET | Latest reading (optional `plant_id`) |
| `/api/readings` | GET | Paginated history with filters |
| `/api/plants/summaries` | GET | Per-plant summaries |
| `/api/plants/<plant_id>/status` | GET | Plant status + latest reading |
| `/api/system/status` | GET | Connectivity (honest: `esp32: "unknown"`) |
| `/api/alerts` | GET | Empty, `generated: false` |

## Build & Test

### Frontend
```bash
cd frontend
npm run build      # TypeScript + Vite production build
npm run lint       # ESLint (0 errors, 0 warnings)
npm run preview    # Preview production build
```

### Backend
```bash
cd backend
STORAGE_BACKEND=memory pytest backend/tests/ -v  # 57 tests pass
```

### Firmware
```bash
cd hardware/firmware
pio run -e glyph_c3      # Release build (DEVELOPMENT_MODE=0)
pio run -e glyph_c3-dev  # Development build (DEVELOPMENT_MODE=1)
pio test -e native-test  # Unit tests (requires native platform)
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/api.md](docs/api.md) | Complete API reference with examples |
| [docs/firmware.md](docs/firmware.md) | ESP32-C3 firmware details (payload, IDs, timestamps, Wi-Fi, retry, optical rules) |
| [docs/system_architecture.md](docs/system_architecture.md) | System architecture and component roles |
| [frontend/README.md](frontend/README.md) | Dashboard architecture, data provider, pages, polling |
| [docs/hardware_setup.md](docs/hardware_setup.md) | Preliminary hardware design notes |
| [docs/firebase.md](docs/firebase.md) | Firebase storage backend integration |
| [docs/data_collection_protocol.md](docs/data_collection_protocol.md) | Proposed data collection workflow and CSV schema |
| [hardware/README.md](hardware/README.md) | Hardware directory overview |
| [3d_Prints/README.md](3d_Prints/README.md) | 3D-printable leaf mount model |

## Known Limitations

| Limitation | Details |
|------------|---------|
| **In-memory storage (default)** | Not persistent across restarts. Use `STORAGE_BACKEND=supabase` with valid credentials for persistence. |
| **No authentication** | Development only. Production requires API keys, JWT, or mTLS. |
| **ESP32 connectivity not verified** | `/api/system/status` reports `esp32: "unknown"` honestly; no CI hardware verification. |
| **Alert generation not implemented** | `/api/alerts` returns empty list with `generated: false`. |
| **Raw NDVI estimate ≠ calibrated NDVI** | Do not use `raw_ndvi_estimate` for plant health decisions. |
| **Calibration pending** | Physical ADS1115 + transimpedance amplifier, LED driver, reference standard (Spectralon), and reflectance linearity not yet validated. |
| **ML pipeline not connected** | No TinyML inference or model scoring; `ml/` directory contains scaffolding only. |
| **Database migrations** | No migration management for Supabase schema changes. |
| **Production Supabase/Firebase** | Requires valid credentials and schema deployment (not included in repo). |

## Sensor Implementation Status

**Physical sensor drivers are implemented in production firmware**, but physical hardware operation has not yet been verified on actual devices.

| Sensor | Driver Status | Calibration Needed |
|--------|---------------|-------------------|
| ADS1115 (optical) | ✅ Implemented (I2C, gain, data rate, single-ended reads) | Transimpedance gain, reference standard |
| DHT22 (temp/humidity) | ✅ Implemented (Adafruit DHT library) | None (factory calibrated) |
| Soil moisture | ✅ Implemented (ESP32 ADC or ADS1115) | Dry/wet ADC points |
| Ambient light (LDR) | ✅ Implemented (ESP32 ADC or ADS1115) | lux_per_adc factor |
| Red/NIR optical sequence | ✅ Implemented (dark → reference → sample) | Reference standard procedure |

**Outstanding calibration items:**
- Soil moisture: `dry_raw` and `wet_raw` ADC points (currently placeholder 3000/1000)
- Optical: Transimpedance amplifier gains, dark offsets, reference standard (Spectralon)
- Ambient light: lux_per_adc calibration factor
- Reference measurement procedure: Physical swap of reference standard required

## License

This project is distributed under the **MIT License** (see `LICENSE`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines (to be added).

---

*This repository contains a working implementation of the data pipeline (ESP32 → Flask → Supabase → Dashboard). Hardware calibration, ML inference, and alerting remain as documented future work. Any circuit details, sensor choices, or model claims should be treated as preliminary until formally validated.*