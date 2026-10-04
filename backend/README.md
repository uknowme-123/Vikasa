# Backend

This folder contains the Flask-based backend for Vikāsa. The current local
implementation validates sensor readings and stores them in a temporary
in-memory backend. Firebase, ESP32 hardware, alerts, and ML inference are not
connected in this phase.

## Proposed responsibilities

- Receive sensor readings from the ESP32 or edge acquisition layer
- Validate and normalize incoming data
- Store and retrieve records for downstream analysis
- Coordinate Firebase synchronization later
- Expose API endpoints for sensor data and plant status

## Planned structure

- `app/` — application package
  - `routes/` — endpoint definitions
  - `services/` — reusable service logic
  - `schemas/` — request and response schema definitions
  - `utils/` — helper functions and shared utilities
- `tests/` — backend validation and API tests

## Implemented API

- `GET /api/health`
- `GET /api/readings/latest`
- `GET /api/readings`
- `POST /api/readings`
- `GET /api/plants/<plant_id>/status`
- `GET /api/plants/summaries`
- `GET /api/system/status`
- `GET /api/alerts`
- Compatibility routes under `/api/sensor-data`

The request and response contract is defined in
`backend/app/schemas/sensor.py`. Raw ADC values remain separate from
calibrated reflectance and NDVI. NDVI is accepted only with both calibrated
reflectance values and is never calculated from raw ADC values.

## Local development

Use the repository virtual environment and keep `STORAGE_BACKEND=memory` in the
local environment. Configure `CORS_ORIGIN` to the frontend origin, normally
`http://localhost:5173`. The in-memory store is non-persistent and is cleared
when the process restarts.

Run the backend tests with:

```powershell
W:\Vikasa\.venv\Scripts\python.exe -m pytest backend\tests -q
```

## Future work

- Authentication and access model
- API versioning and route conventions
- Firebase synchronization and persistence
- Alert trigger and escalation logic
- Persisted alert records and explicit alert rules

## Status

The local API and automated tests are implemented for development. This is not
a production deployment and no hardware or Firebase connectivity is claimed.
