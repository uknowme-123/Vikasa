# Backend

This folder contains the Flask-based backend for Vikāsa. It validates sensor readings against the 24-field Vikāsa schema, computes a raw NDVI estimate from ADC counts, and stores readings using a pluggable storage backend (in-memory, Supabase, or Firebase).

## Implemented responsibilities

- Receive sensor readings from the ESP32-C3 or HTTP clients
- Validate and normalize incoming data using Pydantic schemas
- Compute `raw_ndvi_estimate` from `red_raw` and `nir_raw` (computed field, not stored)
- Enforce NDVI requires both calibrated reflectance values; pairwise reflectance requirement
- Reject timestamps older than 1 year or in the future (>5 min)
- Store and retrieve records via storage abstraction
- Expose REST API endpoints for sensor data, plant summaries, system status, and alerts
- Duplicate detection on `reading_id` (returns 409)

## Storage backends

| Backend | Configuration | Persistence | Use case |
|---------|---------------|-------------|----------|
| **In-memory** | `STORAGE_BACKEND=memory` (default) | No — cleared on restart | Local development, testing |
| **Supabase** | `STORAGE_BACKEND=supabase` + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Yes — PostgreSQL with RLS | Production |
| **Firebase** | `STORAGE_BACKEND=firebase` + Firebase credentials | Yes — Realtime Database | Legacy/alternative production |

All backends implement the `StorageService` interface for swapability.

## Implemented API

- `GET /api/health` — Backend and storage health
- `POST /api/readings` (alias: `/api/sensor-data`) — Create sensor reading
- `GET /api/readings/latest` (alias: `/api/sensor-data/latest`) — Latest reading, optional `plant_id` filter
- `GET /api/readings` (alias: `/api/sensor-data`) — Paginated history with filters (`plant_id`, `session_id`, `start_time`, `end_time`, `page`, `page_size`/`limit`)
- `GET /api/plants/<plant_id>/status` — Plant status + latest reading
- `GET /api/plants/summaries` — Per-plant summaries
- `GET /api/system/status` — System connectivity (honest about unverified hardware: `esp32: "unknown"`, `firebase: "unknown"`)
- `GET /api/alerts` — Alert history (currently empty, `generated: false`)

The request and response contract is defined in `backend/app/schemas/sensor.py`. Raw ADC values remain separate from calibrated reflectance and NDVI. NDVI is accepted only with both calibrated reflectance values and is never calculated from raw ADC values. The response includes a computed `raw_ndvi_estimate` field.

## Local development

Use the repository virtual environment and keep `STORAGE_BACKEND=memory` in the local environment. Configure `CORS_ORIGIN` to the frontend origin, normally `http://localhost:5173`. The in-memory store is non-persistent and is cleared when the process restarts.

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed (defaults work for memory backend)
STORAGE_BACKEND=memory python -m backend.app
```

The API will be available at `http://127.0.0.1:5000/api`.

Run the backend tests with:

```bash
STORAGE_BACKEND=memory pytest backend/tests/ -v
```

All 57 tests should pass.

## Future work

- Authentication and access model
- API versioning and route conventions
- Alert trigger and escalation logic
- Persisted alert records and explicit alert rules
- Database migration management for Supabase schema changes

## Status

The local API, storage abstraction (memory/Supabase/Firebase), and automated tests are implemented for development. No authentication is implemented. ESP32 connectivity is not verified by the API — `/api/system/status` honestly reports `esp32: "unknown"`. Alert generation is not implemented.