# API Documentation

This document outlines the proposed API structure for Vikāsa. It is a planning reference for future implementation and should be treated as an interface specification draft rather than a completed service contract.

## Objectives

The API is intended to handle sensor ingestion, status reporting, and operational data access for the plant monitoring system.

## Proposed API categories

### 1. Sensor ingestion
- Accept readings from ESP32 devices or edge nodes
- Validate reading structure and timestamp consistency
- Store raw and processed observations

### 2. Device health endpoints
- Report connectivity and system status
- Surface battery or power condition if relevant
- Indicate whether the device is online or offline

### 3. Plant condition endpoints
- Return current or historical stress estimates
- Provide summary information for dashboard displays
- Support listing observations by date or device

### 4. Alert endpoints
- Trigger Telegram notifications when configured conditions are met
- Provide recent alert records and acknowledgement status where relevant

## Example request shape

```json
{
  "device_id": "esp32-001",
  "timestamp": "2026-01-01T12:00:00Z",
  "red_reflectance": 0.42,
  "nir_reflectance": 0.78,
  "temperature_c": 28.5,
  "humidity_percent": 58,
  "light_lux": 850
}
```

## Example response shape

```json
{
  "status": "accepted",
  "message": "measurement received",
  "device_id": "esp32-001",
  "recorded_at": "2026-01-01T12:00:00Z"
}
```

## Planned endpoints

The following endpoints are conceptually planned but not yet implemented:

- `GET /health` — service health status
- `POST /api/v1/sensor/readings` — ingest measurement payloads
- `GET /api/v1/devices` — list registered devices
- `GET /api/v1/devices/{id}/status` — device status summary
- `GET /api/v1/plant-summary` — current plant health overview
- `GET /api/v1/alerts` — recent alert history
- `POST /api/v1/alerts/test` — test alert or notification path

## Pending design decisions

- Authentication and authorization model
- API versioning strategy
- Error-handling and validation policy
- Data pagination and filtering conventions
- Device registration and provisioning workflow
- Firebase synchronization format and update semantics

## Documentation status

This API document is intended to guide implementation planning only. It does not represent a production-ready or fully agreed contract.
