# Vikāsa ESP32 Firmware Documentation

## 1. Firmware Architecture

The Vikāsa ESP32 firmware is a modular C++ application built on the Arduino framework for ESP32. It implements a complete sensor data acquisition and transmission pipeline:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Hardware       │────▶│  Firmware Core   │────▶│  API Client     │
│  Interfaces     │     │  (Coordinator)   │     │  (HTTP/JSON)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  ADS1115 ADC    │     │  Reading ID Gen  │     │  Flask API      │
│  Optical Sensors│     │  Timestamp Mgr   │     │  /api/sensor-data│
│  DHT22          │     │  WiFi Manager    │     │                 │
│  Soil Moisture  │     │  Config/Secrets  │     │  Firebase       │
│  Ambient Light  │     │  Dev Mode        │     │  (via backend)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Key Design Principles:**
- Separation of concerns: each subsystem is independently testable
- No hard-coded credentials: all secrets via `secrets.h` (gitignored)
- Explicit unsynchronized timestamp handling
- Deterministic reading_id generation (no randomness)
- Optical measurement rules enforced at compile-time and runtime
- Development mode for testing without hardware

---

## 2. ESP32 Role

The ESP32 acts as a **data acquisition edge device**:
- Reads raw ADC values from optical sensors (via ADS1115)
- Reads environmental sensors (DHT22, soil moisture, ambient light)
- Performs dark/reference correction and reflectance calibration
- Generates deterministic reading IDs
- Manages Wi-Fi connection with auto-reconnect
- Synchronizes time via NTP (with explicit UNSYNCED state)
- Serializes validated payloads to JSON
- POSTs to `POST /api/sensor-data` with retry logic
- **Does NOT** infer health labels, stress types, or classifications

---

## 3. Sensor Interfaces

### 3.1 Optical Sensors (BPW34 via ADS1115)

The BPW34 photodiodes **do not** provide digital red/NIR measurements directly. They require:
- Transimpedance amplifier (current-to-voltage converter)
- LED illumination (red ~660nm, NIR ~940nm)
- ADS1115 16-bit ADC to measure AFE output voltage

**Measurement Sequence (per optical_stub_measure_all):**
1. **Dark readings** - LEDs off, measure dark current offset
2. **Reference readings** - LEDs on, reference standard in place
3. **Sample readings** - LEDs on, leaf/sample in place

**ADS1115 Channel Mapping (4 single-ended channels):**
| Channel | Purpose |
|---------|---------|
| AIN0 | Red / Red Reference (time-multiplexed) |
| AIN1 | NIR / NIR Reference (time-multiplexed) |
| AIN2 | Red Dark / Soil Moisture (shared) |
| AIN3 | NIR Dark / Ambient Light (shared) |

Reference measurements reuse sample channels but are taken at different times with a calibrated reference standard in place.

### 3.2 Environmental Sensors

| Sensor | Interface | Output |
|--------|-----------|--------|
| DHT22 | GPIO (1-Wire) | Temperature (°C), Humidity (%) |
| Soil Moisture | ADC (ESP32 or ADS1115) | Raw ADC, Calibrated % |
| Ambient Light (LDR) | ADC (ESP32 or ADS1115) | Raw ADC, Lux (if calibrated) |

---

## 4. Payload Structure

The firmware payload matches the backend schema exactly (24 columns from `vikasa_sensor_data_template.csv`):

### Required Fields (always present)
| Field | Type | Description |
|-------|------|-------------|
| reading_id | string | Deterministic device-generated ID |
| plant_id | string | From config/secrets |
| session_id | string | From config/secrets |
| timestamp | string | ISO 8601 UTC or "UNSYNCED" |
| operator_id | string | From config/secrets |

### Optional Fields (null if not measured)
| Field | Type | Range | Notes |
|-------|------|-------|-------|
| species | string | max 128 | Operator-set |
| stress_type | string | max 32 | **NOT inferred by device** |
| health_label | string | max 32 | **NOT inferred by device** |
| label_evidence | string | max 256 | **NOT inferred by device** |
| red_raw | uint16 | 0-65535 | Raw ADC, NOT reflectance |
| nir_raw | uint16 | 0-65535 | Raw ADC, NOT reflectance |
| red_dark | uint16 | 0-65535 | Dark correction |
| nir_dark | uint16 | 0-65535 | Dark correction |
| red_reference | uint16 | 0-65535 | Reference standard |
| nir_reference | uint16 | 0-65535 | Reference standard |
| red_reflectance | float | 0-100 | Calibrated % |
| nir_reflectance | float | 0-100 | Calibrated % |
| ndvi | float | -1 to 1 | From calibrated reflectance ONLY |
| temperature_c | float | -50 to 100 | DHT22 |
| humidity_pct | float | 0-100 | DHT22 |
| soil_moisture_raw | uint16 | 0-65535 | Raw ADC |
| soil_moisture_pct | float | 0-100 | Calibrated |
| ambient_light_raw | uint16 | 0-65535 | Raw ADC |
| notes | string | max 512 | Free text |

### Development Mode Marker
| Field | Type | Description |
|-------|------|-------------|
| test_only | bool | `true` only in DEVELOPMENT_MODE=1 |

---

## 5. Reading ID

**Format:** `VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}`

**Example:** `VIKASA-PLANT-001-1700000000000-001`

**Properties:**
- Deterministic: based on plant_id, millis() timestamp, and sequence counter
- Unique within a session: sequence increments per reading, resets on timestamp change
- Backend-compatible: matches pattern `^[A-Z0-9-]{1,64}$`
- Firebase-suitable: enables duplicate detection
- **Not cryptographically unique** - explicitly documented

**Generation Logic:**
```cpp
// millis() since boot (or NTP-synced absolute time if available)
current_ms = millis();
if (current_ms != last_timestamp_ms) {
    sequence_counter = 1;
    last_timestamp_ms = current_ms;
} else {
    sequence_counter++;
}
snprintf(buffer, "VIKASA-%s-%lu-%03lu", plant_id, current_ms, sequence_counter);
```

---

## 6. Timestamp Handling

### States
| State | Constant | Description |
|-------|----------|-------------|
| Unsynchronized | `TIMESTAMP_UNSYNCED` | No NTP, using millis() since boot |
| Syncing | `TIMESTAMP_SYNCING` | NTP request in progress |
| Synchronized | `TIMESTAMP_SYNCED` | NTP successful, valid Unix time |
| Failed | `TIMESTAMP_SYNC_FAILED` | NTP failed after attempts |

### Behavior
- **Never silently creates false timestamps**
- If unsynchronized: timestamp field = `"UNSYNCED"`, `timestamp_synced = false`
- If synchronized: ISO 8601 UTC format `YYYY-MM-DDTHH:MM:SSZ`
- NTP sync attempted on startup and periodically (default 1 hour)
- Sync uses `configTime()` with `pool.ntp.org` (configurable)
- Backend validates: timestamp not in future (>5 min), not older than 1 year

### Configuration
```cpp
#define NTP_SERVER "pool.ntp.org"
#define NTP_TIMEZONE_OFFSET_SEC 0      // UTC
#define NTP_SYNC_INTERVAL_MS 3600000   // 1 hour
```

---

## 7. Wi-Fi Management

### Features
- Credentials from `secrets.h` (never hard-coded)
- Connection timeout (default 15s)
- Auto-reconnect with configurable interval (default 30s)
- Connection state machine: DISCONNECTED → CONNECTING → CONNECTED / FAILED → RECONNECTING
- Callbacks for connected/disconnected/failed events
- RSSI and IP reporting
- Passwords **never logged**

### Configuration
```cpp
#define WIFI_SSID ""              // From secrets.h
#define WIFI_PASSWORD ""          // From secrets.h
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RECONNECT_INTERVAL_MS 30000
```

### Secrets Management
```
config/secrets.example.h  →  copy to secrets.h  →  fill in values
```
`secrets.h` is in `.gitignore` - never committed.

---

## 8. Flask API Communication

### Endpoint
`POST {API_BASE_URL}/sensor-data`

### Headers
```
Content-Type: application/json
Accept: application/json
User-Agent: Vikasa-ESP32/{FIRMWARE_VERSION}
```

### Request Body
JSON-serialized SensorReading (validated before send)

### Response Handling

| HTTP Code | Action |
|-----------|--------|
| 201 Created | Success, reset failure counter |
| 400 Bad Request | Validation error - **no retry**, log details |
| 409 Conflict | Duplicate reading_id - regenerate ID, **retry once** |
| 5xx Server Error | Retry with backoff |
| Timeout/Network | Retry with backoff |
| Other | No retry, log error |

### Retry Behavior
- Max retries: `HTTP_MAX_RETRIES` (default 3)
- Retry delay: `HTTP_RETRY_DELAY_MS` (default 2000ms)
- **No uncontrolled retry loops** - bounded by max_retries
- 400/409 are terminal (no retry for 400, single retry for 409)
- Request timeout: `HTTP_REQUEST_TIMEOUT_MS` (default 10s)

### Configuration
```cpp
#define API_BASE_URL "http://localhost:5000/api"
#define HTTP_REQUEST_TIMEOUT_MS 10000
#define HTTP_MAX_RETRIES 3
#define HTTP_RETRY_DELAY_MS 2000
```

---

## 9. Retry Strategy Summary

| Scenario | Max Retries | Delay | Notes |
|----------|-------------|-------|-------|
| Wi-Fi connect | Unlimited (auto) | 30s | Exponential backoff not implemented |
| NTP sync | Unlimited (periodic) | 5s min between attempts | Rate limited |
| HTTP 5xx | 3 | 2s | Linear backoff |
| HTTP timeout | 3 | 2s | Linear backoff |
| HTTP 409 (duplicate) | 1 | Immediate | Regenerate reading_id |
| HTTP 400 (validation) | 0 | N/A | Terminal - payload bug |
| Network error | 3 | 2s | Linear backoff |

---

## 10. Configuration

All configuration via `config.h` with overrides from `secrets.h`:

### Device Identity
| Macro | Default | Source |
|-------|---------|--------|
| DEVICE_PLANT_ID | "PLANT-UNKNOWN" | secrets.h |
| DEVICE_SESSION_ID | "SESSION-UNKNOWN" | secrets.h |
| DEVICE_OPERATOR_ID | "OPERATOR-UNKNOWN" | secrets.h |

### Network
| Macro | Default |
|-------|---------|
| WIFI_SSID | "" |
| WIFI_PASSWORD | "" |
| API_BASE_URL | "http://localhost:5000/api" |
| NTP_SERVER | "pool.ntp.org" |

### Timeouts
| Macro | Default |
|-------|---------|
| WIFI_CONNECT_TIMEOUT_MS | 15000 |
| WIFI_RECONNECT_INTERVAL_MS | 30000 |
| HTTP_REQUEST_TIMEOUT_MS | 10000 |
| HTTP_MAX_RETRIES | 3 |
| HTTP_RETRY_DELAY_MS | 2000 |

### Development
| Macro | Default |
|-------|---------|
| DEVELOPMENT_MODE | 0 |

### Compile-Time Validation
```cpp
#if (WIFI_CONNECT_TIMEOUT_MS < 5000)
#error "WIFI_CONNECT_TIMEOUT_MS must be at least 5000ms"
#endif
#if (HTTP_MAX_RETRIES < 0 || HTTP_MAX_RETRIES > 10)
#error "HTTP_MAX_RETRIES must be between 0 and 10"
#endif
#if (HTTP_REQUEST_TIMEOUT_MS < 1000)
#error "HTTP_REQUEST_TIMEOUT_MS must be at least 1000ms"
#endif
```

---

## 11. Secrets Management

### File Structure
```
hardware/firmware/
├── config/
│   ├── secrets.example.h   # Template (committed)
│   └── secrets.h           # Actual values (gitignored)
├── include/config.h        # Reads secrets.h if present
```

### Usage
1. Copy `config/secrets.example.h` to `config/secrets.h`
2. Fill in real values
3. `secrets.h` is automatically included by `config.h` via `#ifdef SECRETS_H`
4. Never commit `secrets.h`

### Example secrets.h
```cpp
#define WIFI_SSID "MyWiFi"
#define WIFI_PASSWORD "securepassword123"
#define API_BASE_URL "http://192.168.1.100:5000/api"
#define DEVICE_PLANT_ID "PLANT-001"
#define DEVICE_SESSION_ID "SESSION-2026-001"
#define DEVICE_OPERATOR_ID "OPERATOR-001"
#define DEVELOPMENT_MODE 0
```

---

## 12. Optical Measurement Rules

**Enforced in `calculate_reflectance()` and compile-time assertions:**

### Rule 1: Raw ≠ Reflectance
```cpp
// WRONG: reflectance = raw / 65535 * 100
// RIGHT: reflectance = (sample - dark) / (reference - dark) * 100
```

### Rule 2: Dark Correction Mandatory
```cpp
red_corrected = red_raw - red_dark;
nir_corrected = nir_raw - nir_dark;
red_ref_corrected = red_reference - red_dark;
nir_ref_corrected = nir_reference - nir_dark;
```

### Rule 3: Reference Required for Calibration
- Cannot compute reflectance without reference standard measurement
- Reference measured with same optical path, LEDs on, calibrated target

### Rule 4: NDVI from Calibrated Reflectance Only
```cpp
// WRONG: ndvi = (nir_raw - red_raw) / (nir_raw + red_raw)
// RIGHT: ndvi = (nir_reflectance - red_reflectance) / (nir_reflectance + red_reflectance)
```
- Both `red_reflectance` and `nir_reflectance` must be valid
- Backend validates: NDVI requires both reflectance values

### Rule 5: Pair Consistency
- If `red_reflectance` provided, `nir_reflectance` must also be provided
- Backend validates this pairwise requirement

---

## 13. Hardware Integration Points

### ADS1115 Driver Interface
```cpp
struct Ads1115Driver {
    bool (*init)(Ads1115Driver*, uint8_t address);
    bool (*set_gain)(Ads1115Driver*, Ads1115Gain);
    bool (*set_data_rate)(Ads1115Driver*, Ads1115DataRate);
    int16_t (*read_single_ended)(Ads1115Driver*, Ads1115Channel);
    float (*read_voltage)(Ads1115Driver*, Ads1115Channel);
    void (*deinit)(Ads1115Driver*);
};
```

### Optical Sensor Driver Interface
```cpp
struct OpticalSensorDriver {
    bool (*init)(OpticalSensorDriver*);
    OpticalReading (*read_channel)(OpticalSensorDriver*, OpticalChannel);
    bool (*set_leds)(OpticalSensorDriver*, bool red_on, bool nir_on);
    bool (*measure_all)(OpticalSensorDriver*, 
                        OpticalReading* red_raw,
                        OpticalReading* nir_raw,
                        OpticalReading* red_dark,
                        OpticalReading* nir_dark,
                        OpticalReading* red_ref,
                        OpticalReading* nir_ref);
    void (*deinit)(OpticalSensorDriver*);
};
```

### Environmental Sensor Interfaces
```cpp
// DHT22
Dht22Reading (*read)(Dht22Driver*);

// Soil Moisture
SoilMoistureReading (*read)(SoilMoistureDriver*);
void (*calibrate)(SoilMoistureDriver*, uint16_t dry, uint16_t wet);

// Ambient Light
AmbientLightReading (*read)(AmbientLightDriver*);
```

### Hardware Manager (Composite)
```cpp
struct HardwareManager {
    bool (*init)(HardwareManager*);
    SensorSuiteReading (*read_all)(HardwareManager*);
    void (*deinit)(HardwareManager*);
};
```

---

## 14. Development/Testing Mode

### Activation
```cpp
#define DEVELOPMENT_MODE 1  // In secrets.h or platformio.ini
```

### Behavior
- `DEVELOPMENT_MODE=1` enables:
  - Stub hardware drivers returning deterministic test values
  - Verbose serial logging
  - `test_only: true` in JSON payload
  - Relaxed validation (serializes even if validation fails, with warning)
  - Test payloads clearly marked, never sent to production Firebase by default

### Test Values (Development Mode)
| Sensor | Value |
|--------|-------|
| red_raw | 2100 |
| nir_raw | 3200 |
| red_dark | 45 |
| nir_dark | 52 |
| red_reference | 3800 |
| nir_reference | 3950 |
| red_reflectance | 54.2% |
| nir_reflectance | 79.8% |
| ndvi | 0.191 |
| temperature_c | 24.5°C |
| humidity_pct | 62.3% |
| soil_moisture_raw | 1850 |
| soil_moisture_pct | 42.1% |
| ambient_light_raw | 2900 |

### Unit Tests
Run with: `pio test -e native-test` (requires native platform board config)

Tests cover:
- Reading ID generation (format, uniqueness, sequence)
- Sensor data validation (required fields, ranges, NDVI rules)
- JSON serialization (required/optional fields, test_only marker)
- Configuration validation

---

## 15. Future Calibration Work

### Pending Hardware Integration
1. **Transimpedance Amplifier Design** - Current-to-voltage for BPW34
2. **LED Driver Circuit** - Constant current for red/NIR LEDs
3. **Reference Standard** - Spectralon or calibrated reflectance target
4. **Multiplexer** - Expand ADS1115 beyond 4 channels (ADS1115 has only 4 single-ended)
5. **Calibration Procedure** - Automated dark/reference/sample sequence

### Calibration Parameters (to be determined experimentally)
```cpp
// In OpticalSensorDriver
float red_transimpedance_gain;   // V/A for red AFE
float nir_transimpedance_gain;   // V/A for NIR AFE
float red_dark_offset;           // ADC counts
float nir_dark_offset;           // ADC counts

// In SoilMoistureDriver
uint16_t dry_raw;   // ADC in dry soil
uint16_t wet_raw;   // ADC in saturated soil

// In AmbientLightDriver
float lux_per_adc;  // Calibration factor
```

### Validation Requirements Before Production
- [ ] Physical ADS1115 + AFE circuit tested
- [ ] Dark current stability characterized
- [ ] Reference standard traceability established
- [ ] Reflectance linearity verified (0-100%)
- [ ] NDVI accuracy validated against known samples
- [ ] Temperature compensation for optical sensors
- [ ] Long-term drift characterization

---

## Build & Test Commands

```bash
# Build for ESP32-C3 GLYPH C3 (release)
pio run -e glyph_c3

# Build for ESP32-C3 GLYPH C3 (development mode, DEVELOPMENT_MODE=1)
pio run -e glyph_c3-dev

# Run unit tests (native)
pio test -e native-test

# Monitor serial output
pio device monitor -e glyph_c3
```

---

## Firmware Version
- **Version:** 0.1.0
- **Build:** Auto-generated from git tags
- **Schema:** Compatible with backend `sensor.py` v1.0.0
- **API:** POST `/api/sensor-data` v1.0