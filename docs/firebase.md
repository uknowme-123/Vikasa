# Firebase Realtime Database Integration

This document describes the Firebase storage backend for the Vikāsa Flask API. It consolidates and supersedes `docs/firebase_setup.md`.

## Overview

Firebase is an **optional** storage backend for the Vikāsa Flask API. The default and recommended backend for development and testing is the in-memory storage (`STORAGE_BACKEND=memory`). No Firebase project, database, or credentials are included in this repository.

## 1. Architecture

### Storage Abstraction

The API uses a `StorageService` abstract base class (`backend/app/services/storage.py`) with two implementations:

| Implementation | Class | Use Case |
|---------------|-------|----------|
| In-Memory | `InMemoryStorage` | Development, testing, CI (default) |
| Firebase | `FirebaseStorage` | Production with Firebase project |

The API remains **storage-backend agnostic** — all routes depend only on the `StorageService` interface. The backend is selected at startup via `STORAGE_BACKEND` environment variable.

```
┌─────────────────────────────────────────────────────────────┐
│                      Flask API Routes                       │
│  /sensor-data, /readings, /plants/*, /system/*, /alerts     │
└─────────────────────────┬───────────────────────────────────┘
                          │ StorageService (ABC)
                          ▼
        ┌───────────────────────────────────────┐
        │         InMemoryStorage               │  ◄── STORAGE_BACKEND=memory
        └───────────────────────────────────────┘
        ┌───────────────────────────────────────┐
        │         FirebaseStorage               │  ◄── STORAGE_BACKEND=firebase
        └───────────────────────────────────────┘
```

### Firebase Realtime Database Structure

Sensor readings are stored at the canonical path:

```
/readings/{reading_id}
```

Each record contains the validated sensor payload plus a server-generated `created_at` timestamp. The stable client-supplied `reading_id` is the canonical lookup key.

**Example record:**
```json
{
  "reading_id": "PLANT-001-SESSION-001-20261004-001",
  "plant_id": "PLANT-001",
  "session_id": "SESSION-001",
  "timestamp": "2026-10-04T10:00:00Z",
  "species": "Solanum lycopersicum",
  "stress_type": "healthy",
  "health_label": "healthy",
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
  "notes": "Test reading",
  "created_at": "2026-10-04T10:00:05.123Z"
}
```

### Supported Query Patterns

Firebase Realtime Database can efficiently order/filter by **one indexed child at a time**. The service uses:

- **Plant filter**: `order_by_child("plant_id").equal_to(plant_id)` — primary query
- **Timestamp ordering**: `order_by_child("timestamp")` — for global latest
- **Session/time filters**: Applied locally after bounded server query
- **Pagination**: Sorted and sliced by timestamp after retrieval

For large datasets, a future indexed materialized view may be needed.

### Database Rules and Indexes

Recommended starting rules (not applied automatically — must be reviewed with authentication model):

```json
{
  "rules": {
    "readings": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["plant_id", "session_id", "timestamp"]
    }
  }
}
```

**Do not use permissive public read/write rules in a deployed database.** Device authentication, user roles, and least-privilege access are pending decisions.

## 2. Required Environment Variables

When `STORAGE_BACKEND=firebase`, the following are required:

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_BACKEND` | Yes | Must be `firebase` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project identifier |
| `FIREBASE_DATABASE_URL` | Yes | Realtime Database URL (e.g., `https://project-id-default-rtdb.firebaseio.com/`) |
| `FIREBASE_CREDENTIALS_PATH` | No* | Path to service-account JSON file |
| `FIREBASE_TIMEOUT_SECONDS` | No | Request timeout (default: 10) |
| `FIREBASE_SMOKE_TEST` | No | Enable smoke test (default: `false`) |

* `FIREBASE_CREDENTIALS_PATH` may be omitted when the runtime provides Application Default Credentials (e.g., Google Cloud Run, Cloud Functions).

### Credential Configuration

- The path must point to a **protected file outside the repository**
- Never commit the service-account JSON or copy private keys into `.env.example`
- The file is loaded via `firebase_admin.credentials.Certificate()`

## 3. Operational Modes

The system operates in three distinct modes:

| Mode | Configuration | Behavior |
|------|---------------|----------|
| **Development/Test** | `STORAGE_BACKEND=memory` (default) | Uses `InMemoryStorage`; no Firebase connection; fast, isolated tests |
| **Firebase-Connected** | `STORAGE_BACKEND=firebase` + valid credentials | Uses `FirebaseStorage`; all reads/writes go to Firebase Realtime Database |
| **Smoke-Test** | `FIREBASE_SMOKE_TEST=true` + Firebase-Connected | On initialization, writes and verifies a test record marked `test_only: true` |

### Mode Detection Logic

```python
# In config.py
firebase_smoke_test = os.getenv("FIREBASE_SMOKE_TEST", "false").lower() == "true"

# In firebase_storage.py
if not self._config.firebase_smoke_test:
    logger.info("Smoke test skipped: FIREBASE_SMOKE_TEST not enabled")
    return False
```

**Critical**: The normal Flask startup **must not** write test records. A smoke-test write requires explicit opt-in via `FIREBASE_SMOKE_TEST=true`.

## 4. Firebase Initialization

Initialization occurs on first request (`@app.before_request`) or explicitly via `storage.initialize()`:

1. Validates configuration via `config.validate_firebase_config()`
2. Initializes Firebase Admin SDK:
   - With service account credentials if `FIREBASE_CREDENTIALS_PATH` provided
   - With Application Default Credentials otherwise
3. Creates database reference at `/readings`
4. Sets `_initialized = True`

**Failure handling**: If initialization fails, a `StorageError` is raised with details. The API will return 503 on subsequent requests until fixed.

## 5. Duplicate Protection

The service uses a **Firebase transaction** at `/readings/{reading_id}`:

```python
def reserve_reading(current):
    if current is not None:
        raise DuplicateError(f"Reading with ID {reading.reading_id} already exists")
    return reading_data

await ref.child(reading.reading_id).transaction(reserve_reading)
```

- Transaction only writes when the key is **absent**
- Existing key raises `DuplicateError` (HTTP 409)
- Makes retries with the same `reading_id` safe
- Avoids replacing an existing record

**Reading ID format**: Validated against `READING_ID_PATTERN` (default: `^[A-Z0-9-]{1,64}$`). Device-side generation scheme is a pending decision; the backend only enforces the pattern.

## 6. Error Handling

| Error Type | HTTP Status | When Raised |
|------------|-------------|-------------|
| `ValidationError` | 400 | Invalid request payload |
| `DuplicateError` | 409 | Reading ID already exists |
| `NotFoundError` | 404 | Plant status not found |
| `FirebaseError` | 503 | Firebase operation failed (network, timeout, auth, etc.) |
| `StorageError` | 503 | Generic storage failure |
| `ConfigurationError` | 500 | Invalid config at startup |

All Firebase Admin SDK calls run in a thread pool executor (`asyncio.run_in_executor`) to avoid blocking Flask's event loop.

## 7. Smoke Testing

### Purpose

Verify end-to-end Firebase connectivity (credentials, network, database rules) without creating production data.

### Behavior

When `FIREBASE_SMOKE_TEST=true`:
1. Writes a test record with:
   - `reading_id`: `SMOKE_TEST_{timestamp}`
   - `plant_id`: `SMOKE_TEST_PLANT`
   - `test_only`: `true`
   - `notes`: `FIREBASE SMOKE TEST - NOT A REAL READING`
2. Reads back and verifies `test_only: true`
3. Deletes the test record
4. Returns `True` on success, `False` on failure

### Safety Guarantees

- **Default**: `FIREBASE_SMOKE_TEST=false` — no test writes ever
- **Explicit opt-in required**: Must set `FIREBASE_SMOKE_TEST=true` in environment
- **Test records marked**: `test_only: true` for unambiguous identification
- **Auto-cleanup**: Test record deleted after verification
- **Not run on startup**: Only invoked explicitly (e.g., via admin endpoint or manual script)

### Running a Smoke Test

```bash
# Set environment
export STORAGE_BACKEND=firebase
export FIREBASE_PROJECT_ID=your-project
export FIREBASE_DATABASE_URL=https://your-project.firebaseio.com/
export FIREBASE_CREDENTIALS_PATH=/secure/path/service-account.json
export FIREBASE_SMOKE_TEST=true

# Run Flask app (smoke test runs on first request, or call explicitly)
python -m backend.app
```

## 8. Security Considerations

### Credential Protection

| Protection | Implementation |
|------------|----------------|
| `.env` ignored | `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` |
| Service account ignored | `.gitignore` excludes `service-account*.json`, `firebase-credentials.json`, `*firebase*credentials*.json` |
| No hard-coded credentials | Credentials loaded from environment/file path at runtime |
| No credential logging | Logs only project ID and database URL, never keys |
| No credential exposure via API | Credentials never returned in any API response |

### .gitignore Verification

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Firebase credentials (never commit)
firebase-credentials.json
service-account*.json
*firebase*credentials*.json

# Local Firebase emulator/runtime files
.firebase/
firebase-debug.log
```

## 9. Local Development

### Without Firebase (Recommended)

```bash
# Default configuration — no Firebase needed
STORAGE_BACKEND=memory
python -m backend.app
```

### With Firebase

```bash
# Copy example and customize
cp .env.example .env
# Edit .env with your Firebase values
STORAGE_BACKEND=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
FIREBASE_CREDENTIALS_PATH=/secure/path/service-account.json

python -m backend.app
```

### Running Tests

All tests use mocked Firebase — no real credentials required:

```bash
# Run all backend tests
cd backend && python -m pytest tests/ -v

# Run only Firebase storage tests
cd backend && python -m pytest tests/test_firebase_storage.py -v
```

## 10. API Endpoints (Storage-Agnostic)

All endpoints work identically regardless of storage backend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sensor-data` | POST | Create reading (alias: `/api/readings`) |
| `/api/sensor-data` | GET | List readings with pagination (alias: `/api/readings`) |
| `/api/sensor-data/latest` | GET | Latest reading (alias: `/api/readings/latest`) |
| `/api/plants/summaries` | GET | Per-plant summaries from stored readings |
| `/api/plants/<plant_id>/status` | GET | Latest reading for specific plant |
| `/api/system/status` | GET | System/storage health (reports `esp32: unknown`, `firebase: unknown`) |
| `/api/alerts` | GET | Empty alerts (generation not implemented) |
| `/api/health` | GET | Health check with storage status |

## 11. Migration from firebase_setup.md

This document consolidates and replaces `docs/firebase_setup.md`. Key additions:

- Explicit operational mode definitions (development, Firebase-connected, smoke-test)
- Complete database structure matching implementation
- All 24 sensor schema fields documented
- Smoke test safety guarantees
- Security verification checklist
- Storage abstraction architecture diagram
- Error handling reference table

## 12. Verification Checklist

Before deploying with Firebase:

- [ ] `STORAGE_BACKEND=firebase` set
- [ ] `FIREBASE_PROJECT_ID` configured
- [ ] `FIREBASE_DATABASE_URL` configured
- [ ] `FIREBASE_CREDENTIALS_PATH` points to valid service account (or ADC available)
- [ ] `.env` file is **not** committed (verify with `git status`)
- [ ] Service account file is **not** in repository (verify with `git status`)
- [ ] Database rules reviewed and deployed
- [ ] Indexes created for `plant_id`, `session_id`, `timestamp`
- [ ] Smoke test run successfully (`FIREBASE_SMOKE_TEST=true`)
- [ ] All backend tests pass (`pytest backend/tests/`)
- [ ] API endpoints verified with real Firebase backend

## 13. Remaining Work

- [ ] Device-side reading ID generation scheme
- [ ] Authentication/authorization model for database rules
- [ ] Materialized views for large-scale queries
- [ ] Alert generation implementation
- [ ] ESP32 device connectivity verification