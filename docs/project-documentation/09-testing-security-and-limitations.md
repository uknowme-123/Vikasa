# Vikāsa – Testing, Security & Limitations

## 1. Testing Strategy

| Area | Tool | Result |
|------|------|--------|
| Backend API | pytest | **57 tests pass** (API, Supabase storage, Firebase storage) |
| Frontend | TypeScript + Vite build, ESLint | Build passes; 0 errors, 0 warnings |
| Firmware | PlatformIO + Unity | 29 unit tests written; compiles for ESP32-C3 |

**What is tested:**
- Data validation and schema rules
- Duplicate reading detection
- Storage backend behaviour (with mocks; no real database needed)
- Reading ID generation, JSON serialization, retry logic (firmware)

## 2. CI/CD (GitHub Actions)

Every push automatically runs:
- **Backend:** Python 3.11 → `pytest`
- **Frontend:** Node 20 → `npm ci`, `npm run build`, `npm run lint`
- **Firmware:** PlatformIO build for the ESP32-C3

**[Optional: insert a screenshot of a passing GitHub Actions run]**

## 3. Security Practices

| Area | Practice |
|------|----------|
| Firmware | Wi-Fi and API settings in `secrets.h` (gitignored); passwords never logged |
| Backend | Supabase keys in `.env` (gitignored); service-role key used only on the backend |
| Frontend | Settings in `.env.local` (gitignored) |
| Repository | Only `.example` template files are committed |

⚠️ **Current gap:** API endpoints have no authentication yet, so the system is for development and lab use only.

## 4. Known Limitations

| Limitation | Details |
|------------|---------|
| No authentication | API is open; needs API keys / JWT before real deployment |
| Hardware not field-tested | Firmware compiles but has not been validated on the physical device |
| Calibration pending | Optical, soil and light calibration not yet done |
| Alerts not implemented | `/api/alerts` returns an empty list |
| ML not connected | No trained model or inference yet |
| In-memory default | Data is lost on restart unless Supabase is configured |
| No migration tooling | Database schema changes are applied manually |

## 5. Pending Calibration Items

- Soil moisture dry/wet ADC points (currently placeholders 3000 / 1000)
- Optical transimpedance gains and dark offsets
- Reference standard (Spectralon) measurement procedure
- Ambient light lux-per-ADC factor
