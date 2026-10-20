# Vikāsa Future Development Roadmap

> **Status**: This document describes proposed future work. It does not commit to delivery dates, budgets, or specific implementations. All proposed components require evaluation, testing, and validation before integration.

---

## 1. Project Vision

**Vikāsa** is an ESP32-C3-based plant health monitoring prototype that uses red (660 nm) and near-infrared (940 nm) optical reflectance sensing to compute NDVI-related indices, complemented by environmental sensors (temperature, humidity, soil moisture, ambient light). The system implements a complete data pipeline:

```
ESP32-C3 (firmware) → Wi-Fi → Flask REST API → Supabase/Firebase PostgreSQL → React/TypeScript Dashboard
```

### Current Capabilities (Implemented)

| Component | Status |
|-----------|--------|
| ESP32-C3 firmware (ADS1115 optical, DHT22, soil moisture, ambient light) | Compiles ✅; physical hardware not yet validated |
| Optical measurement sequence (dark → reference → sample) | Implemented in firmware |
| Reflectance calculation (dark-corrected, reference-calibrated) | Implemented in firmware |
| NDVI from calibrated reflectance only (never from raw ADC) | Enforced in firmware + backend |
| Deterministic reading IDs (`VIKASA-{PLANT_ID}-{TIMESTAMP_MS}-{SEQUENCE}`) | Implemented |
| NTP time synchronization with explicit `UNSYNCED` state | Implemented |
| Flask API with Pydantic validation (24-field schema) | 57 tests pass ✅ |
| Pluggable storage (in-memory dev, Supabase prod, Firebase legacy) | Implemented |
| React/TypeScript dashboard with 10s polling, 7 pages | Build passes ✅ |
| Unit tests (firmware native, backend pytest) | Configured ✅ |

### Known Limitations (from repository evidence)

- **Physical calibration pending**: Transimpedance amplifier gains, dark offsets, reference standard (Spectralon) procedure not validated
- **No authentication** on API endpoints (development only)
- **ESP32 connectivity not verified** by CI; `/api/system/status` honestly reports `esp32: "unknown"`
- **Alert generation not implemented** (`/api/alerts` returns empty, `generated: false`)
- **ML pipeline is scaffolding only** — no trained models, no inference, requires verified labeled dataset
- **In-memory storage default** — not persistent across restarts
- **Database migration management** not implemented for Supabase schema changes

### Vision for Evolution

Future improvements should make the system more **reliable** (calibrated, validated measurements), **scalable** (multi-device, multi-plant, robust connectivity), and **useful** (actionable insights for plant monitoring and research). All proposals below are **unevaluated** and require feasibility assessment before commitment.

---

## 2. Future Hardware and Component Integration

> **Principle**: No proposed component is claimed as integrated. Each requires compatibility, cost, power, and calibration evaluation.

### A. Optical Sensing Improvements

| Proposed Upgrade | Purpose | Evaluation Needed |
|------------------|---------|-------------------|
| Improved red/NIR optical assembly (better LED–photodiode geometry, baffling) | Reduce stray light, improve repeatability | Optical bench testing, mechanical design |
| Additional wavelengths (e.g., 730 nm, 850 nm) or multispectral sensor (AS726x, custom filter array) | Enable additional vegetation indices (NDRE, EVI, PRI) | Spectral relevance to target use cases; PCB space; ADC channels |
| Dedicated ambient-light shielding (mechanical enclosure, optical isolation) | Eliminate ambient contamination of reflectance measurements | Enclosure design, thermal management |
| Stable constant-current LED drivers (instead of GPIO-switched) | Reduce LED output drift with temperature/supply voltage | Driver IC selection, PCB layout, power budget |
| Transimpedance amplifier (TIA) redesign with selectable gain | Match photodiode current range to ADC; improve SNR | Gain selection, noise analysis, bandwidth |
| Repeatable optical reference-standard calibration procedure (Spectralon or calibrated diffuse reflector) | Traceable reflectance calibration | Reference material procurement, handling protocol, field practicality |
| Dedicated optical sensor PCB (separate from main MCU board) | Isolate analog front-end from digital noise; allow sensor-head placement flexibility | Connector/cable spec, signal integrity, mechanical mounting |

### B. Environmental Sensors

For each proposed sensor: **compatibility, cost, power requirements, calibration procedure, and ADC channel availability must be evaluated before integration.**

| Proposed Sensor | Purpose | Key Considerations |
|-----------------|---------|-------------------|
| Calibrated capacitive soil-moisture sensor (e.g., Chirp, custom PCB) | Replace resistive probe; reduce corrosion, improve stability | I²C address conflicts, power during measurement, calibration curve |
| Calibrated ambient-light sensor (e.g., BH1750, TSL2591) with lux output | Replace LDR; provide SI-traceable illuminance | Spectral response match to plant-relevant PAR; I²C bus sharing |
| Barometric pressure sensor (e.g., BMP280, BME280) | Environmental context; altitude compensation for gas sensors | I²C address; added value vs. cost for plant monitoring |
| Leaf/soil temperature (contact thermistor or IR thermopile e.g., MLX90614) | Detect water stress via canopy temperature; separate air vs. leaf temp | Mounting geometry, emissivity calibration, power |
| Leaf-wetness sensor (dielectric or resistive grid) | Research fungal disease risk conditions | Calibration to wetness duration, contamination, power |
| Electrical conductivity (EC) sensor (soil pore water or hydroponic) | Nutrient solution monitoring, salinity stress | Electrode polarization, temperature compensation, corrosion |
| pH sensor (ISFET or glass electrode with signal conditioning) | Soil/nutrient pH for research | Reference electrode stability, calibration frequency, cost |

### C. Embedded Hardware Improvements

| Proposed Improvement | Purpose | Dependencies |
|----------------------|---------|--------------|
| Custom PCB integrating ESP32-C3, ADS1115, TIA, LED drivers, power regulation, sensor connectors | Replace breadboard/prototype; improve reliability, EMI, manufacturability | Schematic validation, fabrication, assembly, bring-up |
| Improved power regulation (LDO + buck), reverse-polarity protection, input TVS diodes | Field robustness; prevent damage from miswiring | Component selection, thermal design |
| Battery-powered operation (LiPo/LiFePO₄) with fuel-gauge (MAX17048) or coulomb counter | Untethered deployment; solar charging option | Battery chemistry selection, charging circuit, low-voltage cutoff |
| Deep-sleep / low-power modes (ESP32-C3 deep sleep, sensor power gating) | Extend battery life for remote deployments | Wake-up source (timer, GPIO), sensor re-initialization time, NTP re-sync |
| Modular sensor connectors (JST-SH, Molex PicoBlade, or screw terminals) | Field maintenance, sensor swap, strain relief | Pinout standardization, cable specs, waterproofing |
| Improved enclosure (IP65/67), cable glands, breathable vent (Gore-Tex) | Outdoor/weather resistance | Thermal management, optical window material, mounting |
| 3D-printed mounting components (leaf clip, soil probe holder, sensor head bracket) | Repeatable sensor positioning across measurements | Print material (PETG, ASA), dimensional tolerance, UV resistance |

### D. Optional Future Connectivity

> Treat these as **alternatives to evaluate**, not components that must all be added.

| Technology | Suitable For | Trade-offs |
|------------|--------------|------------|
| **Wi-Fi (current)** | Lab, greenhouse, campus with LAN coverage | High power; limited range; requires infrastructure |
| **Bluetooth Low Energy (BLE)** | Local configuration, nearby diagnostics, phone app pairing | Short range; not for continuous streaming; adds firmware complexity |
| **LoRa/LoRaWAN (e.g., SX1262, RN2903)** | Remote agriculture, no Wi-Fi, multi-km range | Low data rate; duty-cycle limits; gateway dependency; regulatory |
| **Gateway architecture** (ESP32-C3 + LoRa/Wi-Fi gateway → cloud) | Multi-node deployments where only gateway has internet | Additional hardware; gateway firmware; single point of failure |

**Decision framework**: Choose connectivity based on deployment scenario (lab vs. field), data rate needs, power budget, and infrastructure availability. Do not add all simultaneously.

---

## 3. Firmware and Embedded Software Roadmap

| Proposed Improvement | Description | Priority |
|----------------------|-------------|----------|
| **Sensor-specific calibration configuration** | Store calibration coefficients (TIA gains, dark offsets, soil dry/wet points, lux/ADC factor) in NVS or external EEPROM; load at boot | High |
| **Robust sensor initialization & recovery** | Retry I²C init, detect stuck bus, power-cycle sensors via MOSFET, graceful degradation when one sensor fails | High |
| **Enhanced diagnostic logs & error codes** | Structured logging (JSON over serial), error codes per subsystem, health telemetry in `/status` payload | High |
| **Non-blocking sensor acquisition** | Replace `delay()` with state machine; allow Wi-Fi/NTP maintenance during measurement settling | Medium |
| **Reliable transmission retries with backoff** | Exponential backoff, jitter, max retry budget; distinguish transient vs. permanent errors | High |
| **Local buffering during connectivity loss** | Circular buffer in SPIFFS/LittleFS or PSRAM (if available); flush on reconnect; respect flash wear | Medium |
| **Firmware configuration management** | Runtime-configurable plant_id, session_id, measurement interval, API URL via BLE/Serial/OTA; persist in NVS | Medium |
| **OTA firmware updates** | Signed firmware images, rollback on boot failure, version pinning, HTTPS download; authenticate server | Medium |
| **Power monitoring & low-power operation** | Battery voltage, charge state, deep-sleep scheduling, sensor power gating; report in telemetry | Medium |
| **Unit tests for data validation, serialization, measurement logic** | Extend native tests (Unity) for reflectance calc, NDVI, reading_id, timestamp, JSON serialization | High |

### Data Integrity Preservation

- **Raw ADC readings** → stored as `red_raw`, `nir_raw`, `red_dark`, `nir_dark`, `red_reference`, `nir_reference`
- **Calibrated reflectance** → `red_reflectance`, `nir_reflectance` (percentage, 0–100%)
- **Estimated measurements** → `raw_ndvi_estimate` (from ADC only, labeled as estimate)
- **Validated NDVI** → `ndvi` (only when both reflectances present, clamped –1 to 1)
- **Never** compute NDVI from raw ADC and store as calibrated NDVI
- **Never** default missing calibrated values to 0 — use `null`/`Optional`

---

## 4. Backend, Database and IoT Improvements

| Proposed Enhancement | Description | Dependencies |
|----------------------|-------------|--------------|
| **Detailed sensor/device health reporting** | Extend `/api/system/status` with per-sensor last-reading-age, error counts, firmware version, battery, RSSI | Firmware telemetry payload |
| **Device registration & unique device identification** | Device registry table; API key per device; reject unregistered `reading_id` prefixes | Auth design, key rotation |
| **Historical reading queries & date-range filtering** | Already supported via `start_time`/`end_time` in `list_readings`; add aggregation endpoints (daily mean, min/max) | Index optimization |
| **Better API validation, error handling, request logging** | Structured error responses (RFC 7807), request ID correlation, audit log for write endpoints | Logging middleware |
| **Database retention & backup strategy** | Partition by time, automated backup (Supabase PITR), archival policy for raw ADC vs. calibrated | Supabase plan, cost analysis |
| **Authentication & authorization** | API keys for device ingestion; JWT/OIDC for dashboard users; role-based access (admin, operator, viewer) | Auth provider selection (Supabase Auth, custom) |
| **Per-device configuration & calibration metadata** | Store calibration coefficients, sensor types, firmware version in device registry; serve to firmware on request | Device registry, config endpoint |
| **Alerts on device silence or threshold breach** | Configurable rules (e.g., "no reading > 2× interval", "NDVI < 0.1", "soil_moisture_pct < 10%"); webhook/email/Telegram | Rule engine, notification channels |
| **Optional MQTT integration** | If multi-device architecture requires pub/sub (e.g., gateway → cloud broker); keep HTTP as primary for simplicity | Broker selection, topic schema, bridge to Flask |

> Do not introduce a second backend or database without explaining why it would be useful. The current Flask + Supabase architecture is sufficient for foreseeable scale.

---

## 5. Dashboard and User Interface Enhancements

> Only describe as future work when **not already implemented** (per `frontend/README.md` current pages).

| Proposed Enhancement | Description | Current Status |
|----------------------|-------------|----------------|
| **Historical charts for all sensors** | Time-series plots for temperature, humidity, soil moisture, ambient light, optical raw/reflectance | Partial: Overview has env trends; Optical has calibrated comparison |
| **NDVI & calibrated reflectance visualizations** | Dedicated NDVI trend, reflectance spectra bar, reference vs. sample comparison | Partial: Optical page shows latest; history table exists |
| **Sensor status, last-seen, data freshness indicators** | Per-sensor "last updated", "stale" badge, connectivity icon | Partial: System Status page shows API/ESP32/Firebase |
| **Multi-device & multi-plant support** | Device selector, plant registry, session grouping, comparative views | Partial: Plant Monitoring has plant list; no device registry |
| **Plant profiles & measurement history** | Species, variety, sowing date, location, notes; timeline of all readings | Not implemented |
| **Configurable thresholds & alert history** | UI to set per-plant/species thresholds; alert log with acknowledgment | Not implemented (backend `/api/alerts` returns empty) |
| **Export to CSV for analysis/research** | Download filtered readings as CSV matching template schema; include metadata | Not implemented |
| **Mobile-responsive layouts** | Tailwind responsive utilities; test on mobile Safari/Chrome | Partial: Tailwind configured; needs verification |
| **Better indication of invalid/missing/estimated/calibrated values** | Visual distinction (icons, tooltips, color coding) for `null`, `raw_ndvi_estimate`, calibrated NDVI | Partial: "Not available" shown; raw NDVI labeled |

---

## 6. Data Analytics and Optional AI/ML

> **Staged, evidence-based approach**. Do not claim AI/ML models exist unless the repository confirms them (it does not — `ml/README.md` states "planned ML pipeline only").

### Stage 1: Reliable Labeled Dataset (Prerequisite)

- [ ] Collect verified Vikāsa hardware data under controlled conditions
- [ ] Record: plant species, variety, growth stage, environmental conditions, measurement protocol
- [ ] Ensure **both calibrated reflectances** (`red_reflectance`, `nir_reflectance`) are present
- [ ] Require `health_label` + `label_evidence` for any supervised task (visual inspection, destructive assay, expert annotation)
- [ ] Store raw ADC, dark, reference, reflectance, NDVI, environmental — all 24 fields

### Stage 2: Statistical Baselines

- [ ] Compare optical measurements across controlled conditions (well-watered vs. drought, healthy vs. diseased)
- [ ] Evaluate simple thresholds (NDVI, reflectance ratios, temporal derivatives)
- [ ] Establish baseline accuracy, false-positive/negative rates **before** complex models

### Stage 3: Plant-Stress Trend Detection (If Data Permits)

- [ ] Time-series anomaly detection on NDVI/reflectance trajectories
- [ ] Correlate with environmental drivers (VPD, soil moisture, temperature)
- [ ] Validate on held-out plants/growth cycles

### Stage 4: Lightweight Models / TinyML (Only If Justified)

- [ ] **Dataset quality** ≥ 500+ labeled readings across conditions
- [ ] **Compute limits**: ESP32-C3 has 400 KB SRAM, 4 MB flash — model must fit
- [ ] **Validation**: Cross-validated metrics on independent test set; track confusion matrix
- [ ] Candidates: Decision tree, logistic regression, tiny neural net (TensorFlow Lite Micro)
- [ ] **Do not** deploy without quantified accuracy and failure-mode analysis

### Stage 5: Plant-Disease Classification (High Bar)

- [ ] Requires **labeled images or hyperspectral measurements** — not achievable with 2-band NDVI alone
- [ ] Independent validation on unseen genotypes/environments
- [ ] Document false-positive rate; avoid diagnostic claims

### Critical Guardrails

- **NDVI alone cannot diagnose every plant disease or prove plant health** — it is a vegetation vigor proxy
- No AI/ML model exists in this repository (`ml/` is scaffolding only)
- Any model introduction must pass: data availability check → baseline comparison → validation → monitoring

---

## 7. Testing and Validation Roadmap

### Physical Hardware Validation

| Test | Description | Type |
|------|-------------|------|
| Bench testing of each physical sensor | Verify ADC response, range, noise floor, linearity with known inputs | Hardware |
| Calibration against reference measurements | Spectralon reflectance standard; gravimetric soil moisture; calibrated thermometer/hygrometer; lux meter | Hardware |
| Optical repeatability testing | Repeated measurements on static target; compute CV% for raw ADC, reflectance, NDVI | Hardware |
| Raw vs. calibrated comparison | Plot raw ADC vs. reference-corrected reflectance; verify dark subtraction, reference normalization | Hardware |
| Environmental chamber tests | Temperature/humidity cycling; verify sensor drift, condensation handling | Hardware |
| Enclosure & weather protection tests | IP rating verification, thermal rise, UV exposure, cable strain | Hardware |
| Battery runtime measurement | Discharge test with measurement interval + deep sleep; validate fuel gauge | Hardware |

### Software & Integration Validation

| Test | Description | Type |
|------|-------------|------|
| End-to-end ESP32 → Flask → Supabase → React validation | Send known payload; verify storage, retrieval, dashboard display | Integration |
| Long-duration reliability test | 7+ day continuous operation; track missed readings, Wi-Fi drops, NTP drift, memory leaks | Integration |
| Power consumption profiling | Measure current in active, Wi-Fi, deep sleep; validate battery life estimates | Integration |
| Regression testing via GitHub Actions | Backend pytest (57 tests), frontend build/lint, firmware native tests on every PR | CI/CD |

> **Distinction**: Software tests (unit, integration, CI) validate code logic. Physical hardware validation validates that the actual circuit, sensors, and environment produce trustworthy measurements. Both are required.

---

## 8. Potential Future Applications

> **Not validated**. Real agricultural deployment requires additional reliability, calibration, and field testing.

| Application | Description | Maturity Gap |
|-------------|-------------|--------------|
| **Plant growth observation** (labs, education) | Non-invasive tracking of NDVI trajectory over growth cycle | Calibration, repeatability |
| **Greenhouse monitoring** | Multi-point environmental + optical sensing for climate control | Multi-device, alerting, reliability |
| **Small-scale agricultural experiments** | Plot-level treatment comparison (irrigation, nutrient, variety) | Statistical design, replication, field ruggedness |
| **Comparative plant-stress studies** | Controlled drought/salinity/heat stress with optical + environmental correlation | Labeled stress levels, controlled conditions |
| **Research datasets for optical plant monitoring** | Open dataset of calibrated reflectance + ground truth for ML community | Standardized protocol, metadata, licensing |
| **Multi-node plant monitoring deployments** | 10–100 nodes with gateway; spatial variability mapping | Connectivity, device mgmt, OTA, power |

---

## 9. Phased Priorities

| Phase | Proposed Work | Dependencies | Completion Criteria | Status |
|-------|---------------|--------------|---------------------|--------|
| **1. Prototype Stabilization & Documentation** | Finalize firmware config (secrets, intervals), document build/deploy, write hardware setup guide, verify CI passes | Current repo state | `pio run -e glyph_c3` builds; `pytest` 57 pass; `npm run build` passes; docs reflect actual commands | **In progress** |
| **2. Physical Sensor Verification & Calibration** | Bench-test ADS1115+TIA+LED+photodiode; measure dark offsets, reference standard procedure; calibrate soil moisture (dry/wet), ambient light (lux/ADC); validate reflectance linearity | Phase 1; hardware assembled | Calibration coefficients documented; repeatability CV% < 5% for reflectance; soil moisture % matches gravimetric | **Proposed** |
| **3. Hardware & PCB Improvements** | Design custom PCB (schematic → layout → fab → bring-up); integrate power protection, battery, connectors; 3D-print mounts; enclosure test | Phase 2 | PCB v1 powered, all sensors enumerate, firmware runs on target, enclosure fits | **Proposed** |
| **4. Backend, Database & Dashboard Enhancements** | Auth (API keys + JWT), device registry, alert rules/engine, CSV export, mobile-responsive CSS, plant profiles, historical charts | Phase 1 (backend stable) | Auth enforced; device registry CRUD; alerts fire on thresholds; CSV export matches template; dashboard passes mobile audit | **Proposed** |
| **5. Additional Connectivity & Multi-Device Support** | Evaluate BLE for config, LoRa for remote; implement gateway if chosen; multi-device dashboard, fleet status, OTA rollout | Phase 3 (PCB with radio footprint) | At least one alternative connectivity tested; multi-device dashboard shows fleet; OTA updates signed & rolled back | **Proposed** |
| **6. Data Collection & Optional Analytics/AI** | Collect labeled dataset per Stage 1; statistical baselines (Stage 2); evaluate TinyML only if data quality & compute allow | Phase 4 (data pipeline reliable) | ≥ 500 labeled readings; baseline metrics documented; if model: test-set accuracy + confusion matrix published | **Proposed** |
| **7. Long-Duration & Field Validation** | 30+ day greenhouse/field deployment; track data completeness, sensor drift, battery, connectivity; iterate on enclosure, firmware, alerts | Phases 3–5 | > 95% reading success rate; no unplanned reboots; alerts actionable; maintenance log documented | **Proposed** |

> **Status definitions**: `Proposed` = not started, `Planned` = scoped & resourced, `In progress` = actively working, `Blocked` = waiting on dependency, `Completed` = done & verified. No dates or percentages invented.

---

## 10. Component and Software Evaluation Table

| Component / Technology | Proposed Purpose | Existing or Proposed | Dependencies / Considerations |
|------------------------|------------------|----------------------|-------------------------------|
| Optical sensing PCB (dedicated) | Isolate analog front-end; repeatable geometry | Proposed | Schematic, fab, assembly, bring-up; signal integrity |
| Transimpedance amplifier (selectable gain) | Match photodiode current to ADC range | Proposed | Noise, bandwidth, gain switching, calibration |
| Battery monitor / fuel gauge (MAX17048) | Report SoC, enable low-voltage cutoff | Proposed | I²C address, accuracy, sleep current |
| Calibrated soil moisture (capacitive) | Replace resistive probe | Proposed | I²C/Power, calibration curve, corrosion resistance |
| Calibrated ambient light (BH1750/TSL2591) | SI-traceable lux | Proposed | Spectral response, I²C bus sharing |
| Leaf/soil temperature (MLX90614/thermistor) | Canopy temp for water stress | Proposed | Mounting, emissivity, power |
| Leaf wetness sensor | Disease risk research | Proposed | Calibration, contamination, power |
| EC / pH sensors | Nutrient/salinity studies | Proposed | Electrode maintenance, temp compensation, cost |
| BLE (ESP32-C3 native) | Local config, phone app | Proposed | Firmware complexity, pairing UX, security |
| LoRa/LoRaWAN (SX1262/RN2903) | Remote connectivity | Proposed | Regulatory, duty cycle, gateway, antenna |
| MQTT broker (Mosquitto/EMQX) | Pub/sub for multi-device | Proposed | Bridge to Flask, topic schema, auth |
| OTA updates (signed, rollback) | Fleet firmware management | Proposed | HTTPS, signature verification, partition table |
| CSV export (dashboard) | Research data download | Proposed | Filtering, schema match, large file handling |
| TinyML (TF Lite Micro) | On-device inference | Proposed | Model size < 200 KB, RAM < 100 KB, validated accuracy |
| Spectralon reference standard | Optical calibration traceability | Proposed | Cost (~$300–500), handling, field practicality |

> **None of the above are purchased, tested, compatible, or selected until evidence exists.**

---

## 11. Contribution and Update Policy

### How to Propose Changes

1. **Hardware upgrades**: Open a GitHub Issue with `hardware` label. Include:
   - Component part number, datasheet link, cost estimate
   - Schematic excerpt or block diagram showing integration
   - Power budget impact, ADC/I²C/GPIO pin usage
   - Calibration procedure draft
   - Alternative components considered

2. **Software features**: Open a GitHub Issue with `enhancement` label. Include:
   - User story or research question addressed
   - API schema changes (if any) with Pydantic model diffs
   - UI mockup or component description (for dashboard)
   - Test plan (unit, integration, hardware-in-loop)

3. **Experiments / Data Collection**: Open a GitHub Issue with `research` label. Include:
   - Hypothesis, experimental design, control conditions
   - Measurement protocol (sensor config, timing, reference standard)
   - Labeling procedure for ground truth
   - Data sharing / licensing intent

### Documentation Requirements for Contributors

- **Component choices**: Record part number, supplier, revision, rationale in `hardware/components.md` (to be created)
- **Wiring changes**: Update pinout table in `hardware/README.md` and `config.h`; photograph assembled board
- **Calibration procedures**: Document step-by-step in `docs/calibration_procedure.md` with reference standard, environmental conditions, computed coefficients
- **Test evidence**: Attach logs, plots, raw CSV to Issue or PR; link in `docs/test_evidence/`

### Roadmap Maintenance

- This `ROADMAP.md` is a **living document**. Update it when:
  - A phase moves to `In progress` or `Completed`
  - A component is evaluated and accepted/rejected (move to `Component Evaluation Table` with verdict)
  - New research questions or hardware constraints are discovered
- Review at each major milestone (PCB bring-up, first calibrated dataset, first multi-device deployment)

---

## References

- [Main README](../README.md) — System overview, quick start, schema, known limitations
- [Hardware README](../hardware/README.md) — Hardware directory overview
- [Backend README](../backend/README.md) — API, storage, future work
- [Frontend README](../frontend/README.md) — Dashboard architecture, pages, data integrity rules
- [ML README](../ml/README.md) — Planned ML pipeline, validation note
- [Firmware Documentation](../docs/firmware.md) — ESP32-C3 firmware details
- [System Architecture](../docs/system_architecture.md) — Component roles
- [Hardware Setup Notes](../docs/hardware_setup.md) — Preliminary design notes
- [Data Collection Protocol](../docs/data_collection_protocol.md) — Proposed workflow and CSV schema
- [3D-Printable Leaf Mount](../3d_Prints/README.md) — Mount model

---

*Last updated: 2026-10-20. This roadmap reflects repository state as of commit `HEAD`. Verify current status via `git log --oneline -1` and the linked documentation.*