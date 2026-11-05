# Vikāsa – Installation & User Guide

## 1. Prerequisites

| Tool | Version / Notes |
|------|-----------------|
| Python | 3.11 |
| Node.js | 20 |
| PlatformIO | For firmware build and upload |
| Git | To clone the repository |
| Supabase account | Optional, for persistent storage |

## 2. Clone the Repository

```bash
git clone https://github.com/uknowme-123/Vikasa
cd Vikasa
```

## 3. Backend Setup (Flask API)

```bash
pip install -r requirements.txt
pip install -e .[dev]
cp .env.example .env
# Edit .env → set STORAGE_BACKEND=memory (local) or configure Supabase
python -m backend.app
```
The API runs at **http://127.0.0.1:5000**.

## 4. Frontend Setup (Dashboard)

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local → VITE_API_BASE_URL=http://127.0.0.1:5000
npm run dev
```
The dashboard opens at **http://localhost:5173**.

## 5. Firmware Setup (ESP32-C3)

```bash
cd hardware/firmware
cp config/secrets.example.h config/secrets.h
# Edit secrets.h → Wi-Fi name/password, API URL, plant/session IDs
pio run -e glyph_c3 -t upload     # build and flash to the board
```

## 6. Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `STORAGE_BACKEND` | Backend `.env` | memory / supabase / firebase |
| `SUPABASE_URL` | Backend `.env` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend `.env` | Supabase key (keep secret) |
| `VITE_API_BASE_URL` | Frontend `.env.local` | Backend address |

⚠️ Never share or upload real `.env` files or keys.

## 7. API URL Conventions

| Component | Format |
|-----------|--------|
| Frontend | `http://127.0.0.1:5000` (it adds `/api` itself) |
| Firmware | `http://<server-ip>:5000/api` |

## 8. Quick Start (Windows)

Run `start-vikasa.ps1` in PowerShell to start the backend and frontend together.

## 9. How to Use the Dashboard

1. Open the dashboard in a browser.
2. Use the **Provider Switcher** to connect to the live API (or stay in demo mode).
3. Go to **Overview** to see the current plant and environment status.
4. Open **Optical Sensing** to see reflectance and NDVI.
5. Use **Sensor History** to browse past readings.
6. Check **System Status** to verify the backend and device connections.
