# API Documentation

This document describes the implemented local Flask API. The default storage
backend is an in-memory store for development only; data is cleared when the
process restarts. Firebase, ESP32 hardware, alerts, and ML inference are not
connected in this phase.

## Implemented endpoints

### `GET /api/health`

Returns backend and storage health. The response reports `memory` storage by
default and does not claim that Firebase or hardware is connected.

### `POST /api/readings`

Accepts a JSON sensor reading and returns `201` when it is stored. Invalid JSON
or fields return `400`; duplicate reading IDs return `409`; storage failures
return `503`.

`/api/sensor-data` remains an equivalent compatibility endpoint.

### `GET /api/readings/latest`

Returns the newest reading, optionally filtered with
`?plant_id=PLANT-001`. Returns `404` when no reading is available. The existing
`/api/sensor-data/latest` endpoint remains available.

### `GET /api/readings`

Returns paginated readings. Supported query parameters are:

- `page` — one-based page number
- `page_size` — page size from 1 to 1000
- `limit` — alias for `page_size`, from 1 to 1000
- `plant_id`, `session_id`, `start_time`, `end_time` — optional filters

Invalid pagination values return `400`.

### `GET /api/plants/<plant_id>/status`

Returns the latest available reading for the plant and a `status_available`
flag. If the reading has no recorded `health_label`, the API returns
`health_label: null` and does not infer a health state. Missing plants return
`404`.

### `GET /api/plants/summaries`

Returns one summary per plant represented by stored readings. Each summary
contains the plant ID, latest reading timestamp, reading count, species when
available, and the latest explicitly stored health label. Empty storage returns
an empty list.

### `GET /api/system/status`

Returns backend/storage availability and the configured storage backend. ESP32
and Firebase are reported as `unknown` because neither is verified by this
endpoint. The response does not claim hardware or Firebase connectivity.

### `GET /api/alerts`

Returns an envelope containing `alerts`, `total`, and `generated`. Alert
generation is not implemented, so the current response is a truthful empty
collection with `generated: false`.

## Sensor data contract

The existing schema in `backend/app/schemas/sensor.py` is the single source of
truth:

```json
{
  "reading_id": "READING-001",
  "plant_id": "PLANT-001",
  "session_id": "SESSION-001",
  "timestamp": "2026-10-04T12:00:00Z",
  "operator_id": "OPERATOR-001",
  "red_raw": 2100,
  "nir_raw": 3200,
  "red_reflectance": 54.2,
  "nir_reflectance": 79.8,
  "ndvi": 0.191,
  "temperature_c": 24.5,
  "humidity_pct": 62.3
}
```

Raw ADC values and calibrated reflectance are stored separately. NDVI may only
be supplied when both calibrated reflectance values are present. The backend
never calculates NDVI from raw ADC values.

## Response shape

Successful responses use the existing envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "version": "1.0"
  }
}
```

## Local setup

Set `STORAGE_BACKEND=memory` and configure `CORS_ORIGIN` to the local frontend
origin, normally `http://localhost:5173`. No credentials are required for this
mode.

The frontend consumes the summary, system-status, and empty-alert response
shapes above. Demo mode remains available when no API base URL is configured.

## Limitations

- In-memory readings are not persistent.
- Authentication and authorization are not implemented.
- Firebase and physical hardware are not connected.
- Alert generation and persisted alert records are not implemented.
