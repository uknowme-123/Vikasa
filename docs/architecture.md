# Vikāsa System Architecture

> **Scope**: This document describes the **implemented** architecture with a visual Mermaid diagram. For detailed component responsibilities, see [`system_architecture.md`](system_architecture.md).

---

## High-Level Data Flow

```mermaid
flowchart LR
    subgraph Edge["ESP32-C3 Edge Node (Firmware)"]
        H[Plant Canopy] --> O[Optical Sensors<br/>BPW34 + AFE → ADS1115]
        H --> E[Environmental Sensors<br/>DHT22, Soil Moisture, Ambient Light]
        O --> F[Firmware Core<br/>Dark/Ref Correction → Reflectance → NDVI]
        E --> F
        F --> ID[Reading ID Gen<br/>VIKASA-{PLANT}-{MS}-{SEQ}]
        F --> TS[Timestamp Manager<br/>NTP + UNSYNCED State]
        F --> W[Wi-Fi Manager<br/>Auto-reconnect]
        ID --> API[API Client<br/>HTTP/JSON POST]
        TS --> API
        W --> API
    end

    subgraph Cloud["Backend & Storage"]
        API -->|POST /api/sensor-data| FL[Flask REST API<br/>Pydantic Validation]
        FL -->|raw_ndvi_estimate| FL
        FL --> ST[Storage Abstraction<br/>StorageService Interface]
        ST --> MEM[(In-Memory<br/>Dev Default)]
        ST --> SB[(Supabase<br/>PostgreSQL + RLS)]
        ST --> FB[(Firebase<br/>Realtime DB Legacy)]
    end

    subgraph UI["React Dashboard (Frontend)"]
        SB --> POLL[10s Polling<br/>TanStack Query]
        MEM --> POLL
        FB --> POLL
        POLL --> DASH[Dashboard Pages<br/>Overview, Plants, Optical, History, Alerts, Data, Status]
    end

    style Edge fill:#e8f5e9,stroke:#2e7d32
    style Cloud fill:#e3f2fd,stroke:#1565c0
    style UI fill:#fce4ec,stroke:#c2185b
```

---

## Component Diagram

```mermaid
flowchart TB
    subgraph "ESP32-C3 Firmware (hardware/firmware/)"
        direction TB
        HW[Hardware Manager] --> ADS[ADS1115 Driver<br/>I²C 0x48]
        HW --> OPT[Optical Driver<br/>Red/NIR/Dark/Ref]
        HW --> DHT[DHT22 Driver<br/>GPIO10]
        HW --> SOIL[Soil Moisture<br/>GPIO2 / ADS1115]
        HW --> AMB[Ambient Light<br/>GPIO3 / ADS1115]
        OPT --> LED[LED Control<br/>GPIO6, GPIO7]
        HW --> RID[Reading ID Generator]
        HW --> TM[Timestamp Manager<br/>NTP Sync]
        HW --> WM[Wi-Fi Manager<br/>Auto-reconnect]
        HW --> AC[API Client<br/>HTTP/JSON + Retry]
    end

    subgraph "Flask API (backend/)"
        direction TB
        EP[Endpoints<br/>/api/readings, /api/plants/*, /api/system/status, /api/alerts]
        VAL[Pydantic Validation<br/>schemas/sensor.py]
        COMP[Computed Fields<br/>raw_ndvi_estimate]
        STOR[Storage Service<br/>Interface]
        EP --> VAL
        VAL --> COMP
        COMP --> STOR
    end

    subgraph "Storage Backends (backend/app/services/)"
        direction TB
        STOR --> MEM[MemoryStorage<br/>Dict + Lock]
        STOR --> SB[SupabaseStorage<br/>PostgreSQL async]
        STOR --> FB[FirebaseStorage<br/>Realtime DB]
    end

    subgraph "React Dashboard (frontend/src/)"
        direction TB
        PROV[Data Provider<br/>Demo ↔ Flask]
        TQ[TanStack Query<br/>10s refetchInterval]
        PAGES[Pages<br/>Overview, Plants, Optical, History, Alerts, Data, Status]
        PROV --> TQ
        TQ --> PAGES
    end

    AC -.->|Wi-Fi + HTTP| EP
    STOR -.->|Data| PROV

    classDef fw fill:#e8f5e9,stroke:#2e7d32;
    classDef be fill:#e3f2fd,stroke:#1565c0;
    classDef st fill:#fff3e0,stroke:#ef6c00;
    classDef fe fill:#fce4ec,stroke:#c2185b;
    class HW,HW,ADS,OPT,DHT,SOIL,AMB,LED,RID,TM,WM,AC fw;
    class EP,VAL,COMP,STOR be;
    class MEM,SB,FB st;
    class PROV,TQ,PAGES fe;
```

---

## Sequence Diagram: Measurement Cycle

```mermaid
sequenceDiagram
    participant Plant as Plant/Leaf
    participant ESP as ESP32-C3 Firmware
    participant API as Flask API
    participant DB as Supabase/Firebase
    participant UI as React Dashboard

    Note over ESP: Loop: every 5 min (configurable)
    ESP->>ESP: Check NTP sync status
    alt Not synchronized
        ESP->>ESP: NTP sync attempt
        ESP->>ESP: Defer measurement if still UNSYNCED
    end

    ESP->>Plant: Dark reading (LEDs OFF)
    Plant-->>ESP: red_dark, nir_dark (ADS1115 AIN2, AIN3)
    ESP->>Plant: Reference reading (LEDs ON, Spectralon)
    Plant-->>ESP: red_reference, nir_reference (ADS1115 AIN0, AIN1)
    ESP->>Plant: Sample reading (LEDs ON, leaf in place)
    Plant-->>ESP: red_raw, nir_raw (ADS1115 AIN0, AIN1)

    ESP->>ESP: Dark correction
    Note right of ESP: corrected = raw - dark
    ESP->>ESP: Reflectance calibration
    Note right of ESP: refl = (sample-dark)/(ref-dark) × 100
    ESP->>ESP: NDVI from calibrated reflectance
    Note right of ESP: ndvi = (nir_refl - red_refl)/(nir_refl + red_refl)

    ESP->>ESP: Read environmental sensors
    Note right of ESP: DHT22 (temp/hum), Soil, Ambient
    ESP->>ESP: Generate reading_id
    Note right of ESP: VIKASA-{PLANT}-{MS}-{SEQ}
    ESP->>ESP: Get timestamp (NTP or UNSYNCED)
    ESP->>ESP: Validate payload (ranges, NDVI rules)
    ESP->>API: POST /api/sensor-data (JSON)
    API->>API: Pydantic validation (24 fields)
    API->>API: Compute raw_ndvi_estimate
    API->>DB: Store reading
    DB-->>API: 201 Created
    API-->>ESP: Success / 409 Duplicate
    alt 409 Conflict
        ESP->>ESP: Regenerate reading_id
        ESP->>API: Retry once
    end

    UI->>API: GET /api/readings (every 10s)
    API->>DB: Query latest readings
    DB-->>API: Reading list
    API-->>UI: JSON response
    UI->>UI: Update charts, tables, status
```

---

## Key Architectural Decisions

| Decision | Implementation | Rationale |
|----------|----------------|-----------|
| **Raw vs Calibrated Separation** | Separate fields: `red_raw`/`nir_raw` (ADC) vs `red_reflectance`/`nir_reflectance` (%) | Prevents conflation; enables audit trail |
| **NDVI Source** | Only from calibrated reflectance; backend validates pairwise requirement | Raw ADC NDVI is an estimate only (`raw_ndvi_estimate`) |
| **Timestamp Honesty** | Explicit `UNSYNCED` state; never fabricates timestamps | Data integrity for time-series analysis |
| **Reading ID** | Device-generated deterministic format `VIKASA-{PLANT}-{MS}-{SEQ}` | Enables duplicate detection without central coordinator |
| **Storage Abstraction** | `StorageService` interface with Memory/Supabase/Firebase implementations | Swappable via `STORAGE_BACKEND` env var |
| **Polling** | Frontend 10s interval via TanStack Query `refetchInterval` | Near-real-time UX without WebSocket complexity |
| **Secrets** | Never committed: `secrets.h` (firmware), `.env` (backend), `.env.local` (frontend) | Gitignored templates provided |

---

## API Contract Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Backend + storage health |
| `/api/readings` | POST | Create reading (alias: `/api/sensor-data`) |
| `/api/readings/latest` | GET | Latest reading (optional `plant_id`) |
| `/api/readings` | GET | Paginated history with filters |
| `/api/plants/summaries` | GET | Per-plant summaries |
| `/api/plants/<plant_id>/status` | GET | Plant status + latest reading |
| `/api/system/status` | GET | Connectivity (honest: `esp32: "unknown"`) |
| `/api/alerts` | GET | Alert history (currently empty, `generated: false`) |

**Schema**: 24 fields matching `backend/app/schemas/sensor.py` and `data/raw/hardware/vikasa_sensor_data_template.csv`

---

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Storage | In-memory (`STORAGE_BACKEND=memory`) | Supabase (`STORAGE_BACKEND=supabase`) |
| Firmware | `DEVELOPMENT_MODE=1` (stub drivers, test payloads) | `DEVELOPMENT_MODE=0` (real hardware) |
| Frontend | Demo data provider | Flask provider via `VITE_API_BASE_URL` |
| Auth | None | Required (not yet implemented) |

---

## Related Documentation

- [System Architecture Details](system_architecture.md) — Component roles, verified status, future work
- [Firmware Documentation](firmware.md) — Payload, IDs, timestamps, Wi-Fi, retry, optical rules
- [API Reference](api.md) — Complete endpoint documentation with examples
- [Hardware Setup](hardware_setup.md) — Preliminary design notes (unverified)
- [Data Collection Protocol](data_collection_protocol.md) — Proposed workflow and CSV schema

---

*Last updated: 2026-10-20. Reflects repository state as of commit `HEAD`.*