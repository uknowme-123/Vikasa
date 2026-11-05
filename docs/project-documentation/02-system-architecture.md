# Vikāsa – System Architecture

## 1. High-Level Architecture

Vikāsa follows a three-layer IoT architecture:

```
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│   EDGE LAYER         │      │   CLOUD LAYER        │      │   PRESENTATION       │
│   ESP32-C3 Device    │ ───▶ │   Flask REST API     │ ───▶ │   React Dashboard    │
│   + Sensors          │ WiFi │   + Supabase DB      │ HTTP │   (Web Browser)      │
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

**[Insert architecture diagram image here]**

## 2. Component Roles

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Edge | ESP32-C3 + sensors | Acquire optical and environmental readings, compute reflectance/NDVI, send data |
| Edge | ADS1115 ADC | 16-bit conversion of photodiode signals |
| Cloud | Flask REST API | Receive, validate and store readings; serve data to the dashboard |
| Cloud | Storage service | Abstract interface supporting in-memory, Supabase and Firebase |
| Cloud | Supabase (PostgreSQL) | Persistent production database |
| Cloud | Telegram integration | Notification service |
| Presentation | React dashboard | Display live readings, history, plant status and system health |

## 3. Data Flow

1. The ESP32-C3 takes **dark readings** (LEDs off) to measure background offset.
2. It takes **reference readings** with a white reference standard in place.
3. It takes **sample readings** with the leaf in place.
4. Firmware calculates **reflectance** and **NDVI** from the corrected values.
5. Environmental sensors (DHT22, soil moisture, LDR) are read.
6. A unique **reading ID** and an **NTP timestamp** are attached.
7. The reading is sent as JSON to `POST /api/sensor-data`, with up to 3 retries.
8. The Flask API **validates** the data (Pydantic schema) and rejects duplicates.
9. The reading is **stored** in Supabase.
10. The dashboard **polls the API every 10 seconds** and updates the charts and cards.

## 4. Technology Stack

| Area | Technology |
|------|------------|
| Microcontroller | ESP32-C3 (PCB CUPID GLYPH C3, ESP32-C3-MINI-1-N4, 4 MB flash) |
| Firmware | C++ (Arduino framework), PlatformIO |
| Sensors | BPW34 photodiodes, ADS1115 ADC, DHT22, soil moisture sensor, LDR |
| Backend | Python 3.11, Flask, Pydantic |
| Database | Supabase (PostgreSQL), Firebase (legacy), in-memory (development) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts |
| ML (planned) | Python data-validation, preprocessing, training and export modules |
| Testing | pytest, Unity (firmware), ESLint |
| CI/CD | GitHub Actions |
| Version control | Git, GitHub |

## 5. Key Design Decisions

- **Pluggable storage:** the backend talks to a common `StorageService` interface, so the database can be switched with one setting (`STORAGE_BACKEND`).
- **Raw and calibrated data kept separate:** raw ADC counts are never mixed with calibrated reflectance values.
- **NDVI only from calibrated reflectance:** this prevents misleading health values.
- **Missing values stored as null, never 0:** this keeps the data honest.
- **Deterministic reading IDs:** the backend can detect and reject duplicate uploads.
- **No label inference on the device:** health labels are assigned only by humans or by validated models.
