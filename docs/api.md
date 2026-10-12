# Vikāsa API Documentation

## Overview

The Vikāsa API is a RESTful service for managing plant stress monitoring sensor data. It receives sensor readings from ESP32 devices, validates them against the Vikāsa 24-column sensor schema, stores them in memory/Supabase/Firebase, and exposes data to the frontend dashboard.

**Base URL**: `http://127.0.0.1:5000/api` (development)

**Version**: 1.0.0

---

## Authentication

Currently no authentication is required for development. Production deployments should implement proper authentication.

---

## Endpoints

### Health Check

#### GET `/api/health`

Check the health status of the API and its dependencies.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-10-06T10:30:00.000000",
    "storage": {
      "backend": "memory",
      "total_readings": 0,
      "healthy": true,
      "details": {
        "uptime_seconds": 3600.5,
        "initialized": true
      }
    },
    "firebase": null
  },
  "meta": {
    "timestamp": "2026-10-06T10:30:00.000000",
    "request_id": "abc12345",
    "version": "1.0"
  }
}
```

**Response** (503 Service Unavailable - when storage is unhealthy):
```json
{
  "success": false,
  "error": {
    "error": "STORAGE_ERROR",
    "message": "Storage backend unhealthy",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-10-06T10:30:00.000000",
    "request_id": "abc12345",
    "version": "1.0"
  }
}
```

---

### Sensor Data

#### POST `/api/sensor-data` (or `/api/readings`)

Create a new sensor reading.

**Request Body** (JSON):
```json
{
  "reading_id": "READING-2026-001",
  "plant_id": "PLANT-001",
  "session_id": "SESSION-2026-001",
  "timestamp": "2026-10-06T10:30:00Z",
  "species": "Solanum lycopersicum",
  "stress_type": "drought",
  "health_label": "moderate",
  "label_evidence": "visual inspection",
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
  "ambient_light_raw": 2900,
  "operator_id": "OPERATOR-001",
  "notes": "Test reading"
}
```

**Required Fields**:
- `reading_id` (string, pattern: `^[A-Z0-9-]{1,64}$`)
- `plant_id` (string, 1-64 chars)
- `session_id` (string, 1-64 chars)
- `timestamp` (ISO 8601 UTC, e.g., `2026-10-06T10:30:00Z`)
- `operator_id` (string, 1-64 chars)

**Optional Fields** (all optional, but if provided must be valid):
- `species` (string, max 128 chars)
- `stress_type` (string, max 32 chars)
- `health_label` (string, max 32 chars)
- `label_evidence` (string, max 256 chars)
- `red_raw`, `nir_raw`, `red_dark`, `nir_dark`, `red_reference`, `nir_reference` (integers 0-65535)
- `red_reflectance`, `nir_reflectance`, `soil_moisture_pct`, `humidity_pct` (float 0-100)
- `ndvi` (float -1.0 to 1.0)
- `temperature_c` (float -50 to 100)
- `soil_moisture_raw`, `ambient_light_raw` (integers 0-65535)
- `notes` (string, max 512 chars)

**Validation Rules**:
- If `red_reflectance` or `nir_reflectance` is provided, both must be provided
- If `ndvi` is provided, both `red_reflectance` and `nir_reflectance` must be provided
- All numeric fields must be finite (no NaN, infinity)
- Timestamp must be ISO 8601 format, not in future (>5 min), not older than 1 year
- Raw ADC values: 0-65535 (12-bit ADC)
- Reflectance percentages: 0-100
- NDVI: -1.0 to 1.0

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "reading_id": "READING-2026-001",
    "plant_id": "PLANT-001",
    "session_id": "SESSION-2026-001",
    "timestamp": "2026-10-06T10:30:00Z",
    "species": "Solanum lycopersicum",
    "stress_type": "drought",
    "health_label": "moderate",
    "label_evidence": "visual inspection",
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
    "ambient_light_raw": 2900,
    "operator_id": "OPERATOR-001",
    "notes": "Test reading",
    "created_at": "2026-10-06T10:30:01.000000"
  },
  "meta": {
    "timestamp": "2026-10-06T10:30:01.000000",
    "request_id": "abc12345",
    "version": "1.0"
  }
}
```

**Error Responses**:

*400 Bad Request* - Invalid payload:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        "reading_id must match pattern: ^[A-Z0-9-]{1,64}$",
        "red_raw must be between 0 and 65535"
      ]
    }
  }
}
```

*409 Conflict* - Duplicate reading_id:
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "Reading with ID READING-001 already exists",
    "details": { "reading_id": "READING-001" }
  }
}
```

*400 Bad Request* - NDVI without calibrated reflectance:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": ["NDVI requires calibrated reflectance values"]
    }
  }
}
```

---

#### GET `/api/sensor-data/latest` (or `/api/readings/latest`)

Get the most recent sensor reading, optionally filtered by plant.

**Query Parameters**:
- `plant_id` (optional): Filter by plant ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reading_id": "READING-2026-001",
    "plant_id": "PLANT-001",
    ...
    "raw_ndvi_estimate": 0.208
  },
  "meta": { ... }
}
```

**Empty Response** (404 Not Found):
```json
{
  "success": true,
  "data": null,
  "meta": { ... }
}
```

---

#### GET `/api/sensor-data` (or `/api/readings`)

List sensor readings with pagination and filters.

**Query Parameters**:
- `page` (int, default: 1): Page number (>=1)
- `page_size` (int, default: 50, max: 1000): Items per page
- `plant_id` (string, optional): Filter by plant ID
- `session_id` (string, optional): Filter by session ID
- `start_time` (ISO 8601, optional): Filter readings after this time
- `end_time` (ISO 8601, optional): Filter readings before this time
- `limit` (alternative to `page_size`, int, 1-1000)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      { "reading_id": "...", "plant_id": "...", ..., "raw_ndvi_estimate": 0.208 },
      { "reading_id": "...", "plant_id": "...", ..., "raw_ndvi_estimate": 0.195 }
    ],
    "total": 150,
    "page": 1,
    "page_size": 50,
    "has_more": true
  },
  "meta": { ... }
}
```

---

### Plant Operations

#### GET `/api/plants/summaries`

Get summaries of all plants with stored readings.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "plant_id": "PLANT-001",
      "species": "Solanum lycopersicum",
      "latest_timestamp": "2026-10-06T10:30:00Z",
      "health_label": "moderate",
      "reading_count": 5
    }
  ],
  "meta": { ... }
}
```

---

#### GET `/api/plants/<plant_id>/status`

Get the latest reading and status for a specific plant.

**Path Parameters**:
- `plant_id`: Plant identifier

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "plant_id": "PLANT-001",
    "latest_reading": { ... },
    "health_label": "moderate",
    "status_available": true
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No reading found for plant PLANT-001",
    "details": { "plant_id": "PLANT-001" }
  }
}
```

---

### System Status

#### GET `/api/system/status`

Get system health status without claiming hardware connectivity.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "api": "connected",
    "storage_backend": "memory",
    "storage_healthy": true,
    "esp32": "unknown",
    "firebase": "unknown",
    "last_sync": null,
    "hardware_note": "ESP32 connectivity has not been verified.",
    "firebase_note": "Firebase connectivity is not claimed by this endpoint."
  }
}
```

---

### Alerts

#### GET `/api/alerts`

Get alert history. Currently returns empty as alert generation is not implemented.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "alerts": [],
    "total": 0,
    "generated": false,
    "message": "Alert generation is not implemented."
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-10-06T10:30:00.000000",
    "request_id": "abc12345",
    "version": "1.0"
  }
}
```

**Common Error Codes**:
- `VALIDATION_ERROR` (400): Request validation failed
- `DUPLICATE_RESOURCE` (409): Resource already exists
- `NOT_FOUND` (404): Resource not found
- `STORAGE_ERROR` (503): Storage backend error
- `FIREBASE_ERROR` (503): Firebase operation failed
- `CONFIGURATION_ERROR` (500): Configuration error
- `INTERNAL_ERROR` (500): Unexpected server error

---

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
# Flask API
API_HOST=0.0.0.0
API_PORT=5000
FLASK_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# Storage Backend: "memory" (dev/testing), "supabase" (production), or "firebase"
STORAGE_BACKEND=memory

# Supabase Configuration (required when STORAGE_BACKEND=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TIMEOUT_SECONDS=10

# Firebase Configuration (required when STORAGE_BACKEND=firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=/secure/path/service-account.json
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
FIREBASE_TIMEOUT_SECONDS=10

# Telegram Configuration (optional, for alerts)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Logging
LOG_LEVEL=INFO

# Optional: Custom reading ID validation (regex)
READING_ID_PATTERN=^[A-Z0-9-]{1,64}$
```

---

## Data Schema

The API uses the 24-column Vikāsa sensor schema aligned with `data/raw/hardware/vikasa_sensor_data_template.csv`:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| reading_id | string | Yes | Unique reading identifier |
| plant_id | string | Yes | Plant identifier |
| session_id | string | Yes | Session identifier |
| timestamp | datetime | Yes | ISO 8601 UTC timestamp |
| species | string | No | Plant species |
| stress_type | string | No | Type of stress |
| health_label | string | No | Health assessment |
| label_evidence | string | No | Evidence for health label |
| red_raw | integer | No | Red channel raw ADC (0-65535) |
| nir_raw | integer | No | NIR channel raw ADC (0-65535) |
| red_dark | integer | No | Red channel dark reading (0-65535) |
| nir_dark | integer | No | NIR channel dark reading (0-65535) |
| red_reference | integer | No | Red channel reference (0-65535) |
| nir_reference | integer | No | NIR channel reference (0-65535) |
| red_reflectance | float | No | Red reflectance % (0-100) |
| nir_reflectance | float | No | NIR reflectance % (0-100) |
| ndvi | float | No | Calibrated NDVI index (-1 to 1) |
| raw_ndvi_estimate | float | No (computed) | Raw NDVI estimate from ADC counts (-1 to 1) |
| temperature_c | float | No | Temperature Celsius (-50 to 100) |
| humidity_pct | float | No | Humidity % (0-100) |
| soil_moisture_raw | integer | No | Soil moisture raw ADC (0-65535) |
| soil_moisture_pct | float | No | Soil moisture % (0-100) |
| ambient_light_raw | integer | No | Ambient light raw ADC (0-65535) |
| operator_id | string | Yes | Operator identifier |
| notes | string | No | Additional notes |

**Note**: `raw_ndvi_estimate` is a **computed field** (not stored) calculated as `(nir_raw - red_raw) / (nir_raw + red_raw)` when both raw channels are present. It is **not calibrated NDVI** and should not be used for plant health assessment.

---

## Important Vikāsa Rules

1. **Raw ADC ≠ Reflectance**: Raw ADC counts (`red_raw`, `nir_raw`) are NOT calibrated reflectance. They must be calibrated using reference measurements.

2. **NDVI from Calibrated Reflectance Only**: NDVI must be computed from calibrated `red_reflectance` and `nir_reflectance`, NEVER from raw ADC counts.

3. **No Label Inference**: The backend does not infer health labels from sensor data. Labels must be explicitly provided with evidence.

4. **No Synthetic Data**: The backend does not generate synthetic sensor readings.

5. **Missing = Blank**: Unmeasured values should be omitted (null), never filled with zero or -999.

6. **Raw vs Calibrated Separation**: Raw ADC and calibrated reflectance are stored separately and never conflated.

---

## Running the API

### Development

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run development server (in-memory storage)
STORAGE_BACKEND=memory python -m backend.app
```

The API will be available at `http://127.0.0.1:5000/api`

### Production

```bash
gunicorn -w 4 -b 0.0.0.0:5000 "backend.app:create_app()"
```

---

## Testing

```bash
# Run all tests (requires STORAGE_BACKEND=memory)
STORAGE_BACKEND=memory pytest backend/tests/ -v

# Run specific test file
STORAGE_BACKEND=memory pytest backend/tests/test_readings_api.py -v

# Run with coverage
STORAGE_BACKEND=memory pytest backend/tests/ --cov=backend.app
```

All 57 tests should pass.

---

## Frontend Integration Notes

- **Frontend API base URL**: `http://127.0.0.1:5000` (frontend appends `/api` internally)
- **Firmware API base URL**: `http://127.0.0.1:5000/api` (firmware includes `/api`)
- **Dashboard polling**: Frontend polls `/api/readings` every 10 seconds via TanStack Query `refetchInterval: 10000`
- **Raw NDVI estimate**: Backend includes `raw_ndvi_estimate` in responses; frontend displays it when calibrated NDVI is unavailable, clearly labeled as an estimate