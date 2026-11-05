# Vikāsa – Frontend Dashboard

## 1. Overview

The dashboard is a web application built with **React 18 + TypeScript + Vite + Tailwind CSS**. It uses **TanStack Query** to fetch data from the Flask API every **10 seconds**, and **Recharts** for graphs.

## 2. Dashboard Pages

| Page | What it shows |
|------|---------------|
| **Overview** | Environmental cards, plant summaries, trend charts |
| **Plant Monitoring** | Plant and session selection, measurement history |
| **Optical Sensing** | Raw ADC values, calibrated reflectance, NDVI, raw NDVI estimate, comparison |
| **Sensor History** | Timestamped table of all readings and fields |
| **Alerts** | Alert list with severity badges (empty until alert generation is built) |
| **Dataset / CSV Inspector** | Validates CSV files in the browser and shows data-quality warnings |
| **System Status** | API, ESP32 and database readiness |

**[Insert screenshots of each page here]**

## 3. UI Components

| Component | Purpose |
|-----------|---------|
| NDVICard | Shows the current NDVI value and its meaning |
| PlantStatusCard | Health status of each plant |
| OpticalAnalysisCard | Red/NIR reflectance breakdown |
| StressAnalysisCard | Stress indicators |
| MetricCard | Temperature, humidity, soil moisture, light |
| SystemStatusCard | Backend and device connectivity |
| AlertCard / AlertBanner | Alerts and warnings |
| RecommendationCard | Suggested actions |
| ProviderSwitcher | Switch between demo data and the live Flask API |
| Layout: Header, Sidebar | Navigation |

## 4. Data Provider & API Integration

- The dashboard can run in **Demo mode** (built-in sample data) or **Live mode** (connected to the Flask API).
- The API URL is set with `VITE_API_BASE_URL` in `.env.local` (e.g. `http://127.0.0.1:5000`).
- The **ProviderSwitcher** lets the user connect or disconnect the API and check `/api/health`.

## 5. Data Integrity Rules in the UI

- Missing values are shown as **"Not available"**, never as 0.
- NDVI is shown only when both reflectance values exist.
- Raw ADC values are shown separately from calibrated values.
- The raw NDVI estimate is clearly labelled and shown only when calibrated NDVI is unavailable.

## 6. Build Results

- TypeScript compiles with no errors
- Production build: about 385 KB JS, 52 KB CSS
- ESLint: 0 errors, 0 warnings
