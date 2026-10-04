# System Architecture

This document describes the proposed Vikāsa architecture and the intended responsibilities of each subsystem. It is a planning document, not a validated implementation record.

## System overview

Vikāsa is intended to monitor plant stress through non-invasive optical measurements. The design connects a sensing node, edge firmware, data processing, cloud storage, and user-facing interfaces.

## Proposed component roles

### 1. Sensing hardware
- Red and NIR reflectance sensors collect optical information related to plant surface response.
- Environmental sensors record surrounding conditions such as light, temperature, and humidity.
- The hardware layout and circuit details remain pending validation.

### 2. ESP32 edge node
- The ESP32 is planned as the local acquisition and control unit.
- Firmware is expected to collect sensor readings, apply basic filtering, and transmit structured data to the backend.
- Clock synchronization, message formatting, and power handling are still design decisions.

### 3. Data acquisition and local storage
- Raw measurements are intended to be organized under `data/raw/` before validation.
- Temporary staging and metadata capture are planned in the data pipeline.
- Full data handling rules must be finalized before deployment.

### 4. ML processing pipeline
- `ml/` is organized for validation, preprocessing, feature extraction, training, evaluation, and export.
- The team intends to use a small, efficient ML workflow suitable for embedded or edge-oriented inference.
- Model architecture, target outputs, and thresholding approach remain open pending experiments.

### 5. Flask backend
- The backend is proposed as the central API service.
- It will validate incoming data, store observations, and coordinate integrations.
- This layer is also the likely point for alert logic and health summaries.

### 6. Firebase Realtime Database
- Firebase is proposed as a shared, near-real-time persistence layer.
- It may serve as a communication bridge between hardware data, backend processing, and dashboard consumers.
- The schema and replication policy are pending specification.

### 7. Dashboard and alerts
- The dashboard is intended to visualize plant health trends, sensor history, and alert events.
- Telegram alerts are planned for operational messages and threshold-triggered notifications.
- Exact alert thresholds and user workflows remain undecided.

## Proposed data flow

```text
Plant canopy / field environment
    -> Sensor acquisition (reflectance + environmental)
    -> ESP32 firmware collection and packaging
    -> Raw data staging
    -> Validation and preprocessing
    -> Feature engineering
    -> TinyML inference or scoring
    -> Flask API ingestion
    -> Firebase persistence
    -> Dashboard and Telegram alerts
```

## Architectural assumptions

The following assumptions are part of the current proposal:

- The sensing system should remain non-invasive.
- The device must support low-power or intermittent operation in field conditions.
- Data should be structured enough to support later training and analysis.
- Model and alert policies should be configurable as the system matures.

## Unverified design details

The following items are intentionally left unverified in this documentation:

- Exact reflectance sensor placement and optical geometry
- Specific circuit topology for analog signal conditioning
- Final ADC configuration and noise mitigation strategy
- Power supply stability and enclosure constraints
- Whether inference is performed on-device, server-side, or in both places
- Final model design and stress labels
- Communication protocol and security treatment for backend connectivity

These items require technical review and empirical validation before being treated as final requirements.

## Development outlook

1. Hardware concept definition
2. Sensor and circuit review
3. Firmware prototyping
4. Data acquisition protocol definition
5. ML pipeline design and experimentation
6. Backend integration and storage plans
7. Dashboard, alerting, and operational rollout

This schedule reflects the intended sequence but does not imply that the hardware or ML pipeline has been tested.
