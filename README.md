# Vikāsa

Vikāsa is a proposed non-invasive plant stress monitoring system for Team Nexovate at Bangalore Institute of Technology. It combines red and near-infrared (NIR) reflectance sensing, environmental monitoring, edge inference on an ESP32 device, and a lightweight backend for storage, alerting, and analytics.

## Project intent

The project aims to detect plant stress indicators without invasive sampling by observing reflected light and environmental conditions. The design is intentionally modular so sensor acquisition, ML processing, backend services, and visualization can evolve independently while sharing a common data contract.

## Proposed system architecture

The current architecture is a conceptual design only. The hardware and ML pipeline are not yet finalized or experimentally validated.

1. Sensing layer
   - Red and NIR reflectance sensors measure canopy or leaf surface response.
   - Environmental sensors capture temperature, humidity, light, and related conditions.
   - An ESP32 microcontroller is intended to gather sensor data and perform local preprocessing.

2. Edge processing and inference
   - Firmware on the ESP32 is planned to collect samples, filter noise, and package data for transmission.
   - TinyML is proposed for low-power inference or feature scoring at the edge.
   - Any model deployment at this stage is preliminary and subject to validation.

3. Backend services
   - A Flask backend is planned to receive processed measurement batches.
   - Backend services will handle validation, persistence, and downstream integration logic.
   - Firebase Realtime Database is intended as a shared data layer for near-real-time availability.

4. Alerts and user interfaces
   - Telegram notifications are proposed for operational alerts and thresholded warnings.
   - A dashboard is planned for reviewing plant condition trends and sensor health.
   - Frontend interfaces should be separated from data ingestion and backend business logic.

## Data flow

```text
Plant / canopy
    -> Red + NIR reflectance sensing
    -> Environmental sensors
    -> ESP32 firmware acquisition and conditioning
    -> Raw data storage / local buffering
    -> Validation and preprocessing
    -> Feature extraction
    -> TinyML inference or model scoring
    -> Flask API ingestion
    -> Firebase Realtime Database
    -> Dashboard / analytics / Telegram alerts
```

The flow above describes the intended architecture, not a verified system implementation.

## Main repository areas

- `docs/` — architecture notes and planned operating procedures
- `hardware/` — physical hardware references and integration notes
- `firmware/` — ESP32 firmware source tree and embedded project layout
- `data/` — raw, processed, template, and sample data organization
- `ml/` — data validation, preprocessing, feature engineering, training, evaluation, and model export
- `backend/` — Flask application, routes, schemas, services, and tests
- `dashboard/` — project dashboard documentation and future interface assets
- `frontend/` — user-facing presentation layer and web assets
- `integrations/` — Firebase and Telegram integration placeholders
- `scripts/` — operational helper scripts and automation tasks

## Development stages

### Stage 1 — Requirements and architecture definition
- Define sensing goals, plant species scope, and stress indicators.
- Confirm whether reflectance data will be used for classification, regression, or thresholding.
- Define data ownership, alert policies, and dashboard responsibilities.

### Stage 2 — Hardware concept and circuit design
- Select the reflectance sensor arrangement and analog front-end.
- Define the ESP32 power scheme, sensor interfaces, and data acquisition timing.
- Document calibration and enclosure requirements.

### Stage 3 — Firmware and acquisition pipeline
- Implement sample acquisition logic and local buffering.
- Define message formats between ESP32 and backend.
- Include recovery, retry, and watchdog behavior during deployment.

### Stage 4 — Data and ML workflow
- Collect labeled samples according to a defined protocol.
- Validate sensor quality and metadata consistency.
- Build preprocessing and feature pipelines.
- Train, evaluate, and export a model only after the workflow has been validated.

### Stage 5 — Backend and integrations
- Expose API endpoints for sensor data, summaries, and health status.
- Synchronize processed observations to Firebase.
- Trigger alert logic for Telegram notifications.

### Stage 6 — Dashboard and operational use
- Present stress trends, historical data, and alerts.
- Connect the frontend to backend and Firebase data sources.
- Refine operational thresholds based on field observation.

## Pending decisions and unverified items

The following details are intentionally marked as pending because they are not yet confirmed:

- Exact sensor board topology and wiring arrangement
- Amplifier, ADC, and filtering choices for the reflectance front end
- Final LED / illumination strategy for red and NIR acquisition
- Calibration procedure and reference standards
- Environmental sensor selection and placement constraints
- Exact model input features and target labels
- Thresholds for stress classification and alerting
- Firebase schema and data synchronization policy
- Telegram notification controls and user permission model

These are design considerations to be confirmed during the engineering and validation phases.

## Repository status

This repository currently contains the proposed project structure and documentation scaffolding only. No application logic, hardware validation, firmware implementation, or ML model training has been performed.

## Documentation index

- [docs/system_architecture.md](docs/system_architecture.md)
- [docs/hardware_setup.md](docs/hardware_setup.md)
- [docs/data_collection_protocol.md](docs/data_collection_protocol.md)
- [docs/ml_workflow.md](docs/ml_workflow.md)
- [docs/api_documentation.md](docs/api_documentation.md)

## Notes

This project documentation is written for planning and coordination. Any hardware circuit details, sensor choices, or model claims should be treated as preliminary until they are formally reviewed and validated.
