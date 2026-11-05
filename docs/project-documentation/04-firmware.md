# Vikāsa – Firmware (ESP32-C3)

## 1. Overview

The firmware is a modular C++ application built with the Arduino framework and PlatformIO. It acts as a **data acquisition edge device**: it reads sensors, processes the optical data, and sends validated readings to the backend.

```
Hardware Interfaces ──▶ Firmware Core (Coordinator) ──▶ API Client (HTTP/JSON)
 (ADS1115, DHT22,         (Reading ID, Timestamp,          (POST /api/sensor-data)
  Soil, Light)             Wi-Fi Manager, Config)
```

## 2. Responsibilities of the ESP32

- Read raw ADC values from the optical sensors via the ADS1115
- Read the DHT22, soil moisture and ambient light sensors
- Apply dark and reference correction and calculate reflectance
- Calculate NDVI from calibrated reflectance only
- Generate a unique reading ID
- Manage the Wi-Fi connection with auto-reconnect
- Synchronize time using NTP
- Send JSON readings to the backend with retry logic
- **Does not** assign health labels or stress types

## 3. Design Principles

- Each subsystem is separate and independently testable
- No hard-coded passwords; all secrets are stored in `secrets.h`, which is never committed
- The time-unsynced state is handled explicitly
- Reading IDs are deterministic (no randomness)
- A development mode allows testing without hardware

## 4. Reading ID Format

```
VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}
Example: VIKASA-PLANT-001-1700000000000-001
```
This lets the backend detect and reject duplicate uploads (HTTP 409).

## 5. Time Synchronization

The device synchronizes its clock with NTP servers. If the time is not plausible (not yet synced), the timestamp is sent as **`UNSYNCED`** instead of a fake time.

## 6. Data Transmission

- Protocol: HTTP POST with a JSON body
- Endpoint: `/api/sensor-data`
- Retries: maximum 3 (no infinite loops)
- Missing or unmeasured values are sent as `null`

## 7. Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| reading_id, plant_id, session_id, operator_id | string | Identifiers (required) |
| timestamp | string | ISO 8601 UTC or `UNSYNCED` |
| red_raw, nir_raw | integer | Raw ADC counts (0–65535) |
| red_dark, nir_dark | integer | Dark offset readings |
| red_reference, nir_reference | integer | Reference standard readings |
| red_reflectance, nir_reflectance | float | Calibrated reflectance (0–100 %) |
| ndvi | float | −1 to 1, from calibrated reflectance only |
| temperature_c, humidity_pct | float | From DHT22 |
| soil_moisture_raw, soil_moisture_pct | int / float | Raw and calibrated soil moisture |
| ambient_light_raw | integer | Raw LDR reading |
| species, stress_type, health_label, label_evidence, notes | string | Set by the operator, never by the device |

## 8. Development vs Release Mode

| Mode | Build command | Behaviour |
|------|---------------|-----------|
| Development (`DEVELOPMENT_MODE=1`) | `pio run -e glyph_c3-dev` | Stub sensor drivers, verbose logs, payloads marked `test_only: true` |
| Release (`DEVELOPMENT_MODE=0`) | `pio run -e glyph_c3` | Real sensors, production behaviour |

## 9. Configuration (Secrets)

Copy `config/secrets.example.h` to `config/secrets.h` and fill in:
- Wi-Fi SSID and password
- API base URL (e.g. `http://<server-ip>:5000/api`)
- Plant ID, session ID, operator ID

`secrets.h` is excluded from Git, and the firmware never prints the Wi-Fi password.

## 10. Testing

- 29 unit tests written for reading ID generation, data validation, JSON serialization, configuration, HTTP status handling, retry behaviour and optical data rules
- Run with: `pio test -e native-test`
