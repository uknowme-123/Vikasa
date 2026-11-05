# Vikāsa – Backend API

## 1. Overview

The backend is a **Flask REST API** written in Python 3.11. It receives sensor readings from the ESP32, validates them with **Pydantic**, stores them through a pluggable storage layer, and serves data to the dashboard.

## 2. Project Structure

```
backend/
├── app/
│   ├── config.py            → Environment configuration
│   ├── routes/              → API endpoints (health, sensor_data, operations)
│   ├── schemas/             → Pydantic data models (sensor, responses)
│   ├── services/            → Storage backends, validation, Telegram
│   └── utils/               → Error handling, logging
├── database/migrations/     → SQL schema (001_create_readings.sql)
└── tests/                   → Automated tests (pytest)
```

## 3. Sensor Data Contract

The schema in `backend/app/schemas/sensor.py` is the single source of truth (24 fields).

**Example reading:**
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
  "temperature_c": 24.5,
  "humidity_pct": 62.3,
  "soil_moisture_raw": 1850,
  "soil_moisture_pct": 42.1,
  "ambient_light_raw": 2900
}
```

## 4. Validation Rules

- **Raw ADC ≠ reflectance:** raw values are uncalibrated counts (0–65535).
- **NDVI** is accepted only if both `red_reflectance` and `nir_reflectance` are present.
- **Raw NDVI estimate** = (nir_raw − red_raw) / (nir_raw + red_raw). It is computed for debugging only.
- **Timestamps** older than 1 year or more than 5 minutes in the future are rejected.
- **Missing values** are `null`, never 0.
- **Duplicate** `reading_id` values are rejected with HTTP 409.

## 5. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Backend and storage health check |
| `/api/readings` (alias `/api/sensor-data`) | POST | Submit a new reading |
| `/api/readings/latest` | GET | Latest reading (optional `plant_id` filter) |
| `/api/readings` | GET | Paginated reading history with filters |
| `/api/plants/summaries` | GET | Summary for each plant |
| `/api/plants/<plant_id>/status` | GET | Status and latest reading for one plant |
| `/api/system/status` | GET | System connectivity status |
| `/api/alerts` | GET | Alerts list (generation not yet implemented) |

## 6. Storage Backends

| Backend | Setting | Use |
|---------|---------|-----|
| In-memory | `STORAGE_BACKEND=memory` | Development and testing (not persistent) |
| Supabase | `STORAGE_BACKEND=supabase` | Production: PostgreSQL with Row-Level Security |
| Firebase | `STORAGE_BACKEND=firebase` | Legacy / alternative: Realtime Database |

All three implement a common `StorageService` interface, so switching needs no code changes.

## 7. Database Schema

Table `public.readings` in Supabase, created with `database/migrations/001_create_readings.sql`. Its columns match the 24-field sensor schema.

**[Optional: insert a screenshot of the Supabase table here]**

## 8. Integrations

- **Telegram:** a notification service module (`services/telegram.py`) for sending updates.

## 9. Error Handling & Logging

- Centralized error classes return consistent JSON error responses
- Structured logging for requests and storage operations

## 10. Testing

- **57 automated tests pass** (API tests, Supabase storage mock tests, Firebase storage mock tests)
- Run with: `STORAGE_BACKEND=memory pytest backend/tests/ -v`
