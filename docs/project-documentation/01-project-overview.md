# Vikāsa – Project Overview

**Project:** Vikāsa – Optical Plant Health Monitoring System
**Team:** Team Nexovate, Bangalore Institute of Technology
**Version:** v0.1.0 (Prototype)
**Repository:** https://github.com/uknowme-123/Vikasa

---

## 1. Introduction

Vikāsa is a plant-health monitoring system that detects plant stress using non-invasive optical sensing. It shines red (660 nm) and near-infrared (940 nm) light on a leaf, measures how much light is reflected, and calculates NDVI (Normalized Difference Vegetation Index), a standard indicator of plant health. Along with environmental readings (temperature, humidity, soil moisture and ambient light), this data is sent over Wi-Fi to a backend server, stored in a cloud database and displayed on a live web dashboard.

## 2. Problem Statement

Plant stress caused by drought, nutrient deficiency or disease is usually noticed only once visible symptoms appear (yellowing, wilting), and by then yield or plant health is already affected. Existing tools such as lab spectrometers or drone-based multispectral imaging are expensive and not practical for small farms, greenhouses or research labs. A low-cost, continuous, non-invasive monitoring system is needed.

## 3. Objectives

1. Build a low-cost edge sensor device using the ESP32-C3 microcontroller.
2. Measure red and NIR leaf reflectance and calculate NDVI from calibrated values.
3. Record environmental conditions: temperature, humidity, soil moisture and ambient light.
4. Transmit readings reliably to a cloud backend over Wi-Fi.
5. Store readings in a structured, validated database.
6. Visualize live and historical plant data on a web dashboard.
7. Prepare a clean dataset pipeline for future machine-learning-based stress detection.

## 4. Proposed Solution

```
ESP32-C3 → Wi-Fi → Flask REST API → Supabase (PostgreSQL) → React Dashboard
```

- **Edge device:** reads optical and environmental sensors, applies dark and reference correction, computes reflectance and NDVI, and sends JSON readings.
- **Backend API:** validates each reading and stores it.
- **Database:** Supabase (PostgreSQL) for production, with in-memory and Firebase options.
- **Dashboard:** shows plant status, NDVI, sensor trends and system health, refreshing every 10 seconds.

## 5. Key Features

- Optical measurement pipeline: dark correction → reference calibration → reflectance → NDVI
- Unique, deterministic reading IDs (`VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}`) to prevent duplicates
- NTP time synchronization; readings are explicitly marked `UNSYNCED` instead of using fake timestamps
- Reliable HTTP transmission with bounded retries (maximum 3)
- Strict data validation (24-field schema) on the backend
- Pluggable storage: in-memory, Supabase or Firebase
- Live React dashboard with 7 pages
- Automated testing and CI/CD using GitHub Actions
- 3D-printed leaf mount for consistent sensor positioning

## 6. Team Members

| Name | Role / Responsibility |
|------|----------------------|
| [Name] | [e.g., Hardware & Circuit Design] |
| [Name] | [e.g., Firmware Development] |
| [Name] | [e.g., Backend & Database] |
| [Name] | [e.g., Frontend Dashboard] |

## 7. Current Project Status

| Component | Status |
|-----------|--------|
| ESP32-C3 firmware | Compiles successfully; physical hardware testing pending |
| Sensor drivers (ADS1115, DHT22, soil, light) | Implemented |
| Flask REST API | Complete; 57 automated tests pass |
| Supabase database integration | Complete |
| React dashboard | Complete; build and lint pass |
| CI/CD pipeline | Configured |
| Hardware calibration | Pending |
| Machine learning model | Pipeline scaffolding only; awaiting data |
