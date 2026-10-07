# Vikāsa Dataset Audit Report

Generated: 2026-10-05T19:41:00.353199
Total datasets audited: 1

## Classification Legend

- **HARDWARE_READY**: Verified Vikāsa hardware measurements with calibrated reflectance and verified labels
- **SUPERVISED_TRAINING_CANDIDATE**: Sufficient features and labels for ML, but hardware provenance may need confirmation
- **EXPLORATORY_SPECTRAL_ONLY**: Optical/spectral data without verified labels or environmental context
- **ENVIRONMENTAL_ONLY**: Environmental sensor data without optical measurements
- **LABEL_MAPPING_REQUIRED**: Labels present but evidence/source undocumented
- **PROVENANCE_OR_CALIBRATION_REQUIRED**: Optical data lacks calibration reference or provenance
- **TEMPLATE_ONLY**: Header-only schema template, no data rows

---

## Summary

| Dataset | Rows | Cols | Classification | ML Suitable | Key Warnings |
|---------|------|------|----------------|-------------|--------------|
| vikasa_sensor_data_template.csv | 0 | 24 | TEMPLATE_ONLY, EXPLORATORY_SPECTRAL_ONLY | ❌ | Header-only template; no data rows; No verified labels for supervised training |

---

## vikasa_sensor_data_template.csv

- **Rows**: 0
- **Columns**: 24
- **Column names**: reading_id, plant_id, session_id, timestamp, species, stress_type, health_label, label_evidence, red_raw, nir_raw, red_dark, nir_dark, red_reference, nir_reference, red_reflectance, nir_reflectance, ndvi, temperature_c, humidity_pct, soil_moisture_raw, soil_moisture_pct, ambient_light_raw, operator_id, notes
- **Duplicate rows**: 0
- **Classification**: TEMPLATE_ONLY, EXPLORATORY_SPECTRAL_ONLY

### Missing Values (%)
| Column            |   Missing % |
|:------------------|------------:|
| reading_id        |         nan |
| plant_id          |         nan |
| session_id        |         nan |
| timestamp         |         nan |
| species           |         nan |
| stress_type       |         nan |
| health_label      |         nan |
| label_evidence    |         nan |
| red_raw           |         nan |
| nir_raw           |         nan |
| red_dark          |         nan |
| nir_dark          |         nan |
| red_reference     |         nan |
| nir_reference     |         nan |
| red_reflectance   |         nan |
| nir_reflectance   |         nan |
| ndvi              |         nan |
| temperature_c     |         nan |
| humidity_pct      |         nan |
| soil_moisture_raw |         nan |
| soil_moisture_pct |         nan |
| ambient_light_raw |         nan |
| operator_id       |         nan |
| notes             |         nan |

### Unique Identifiers
- **reading_id**: 0 unique values
- **plant_id**: 0 unique values
- **session_id**: 0 unique values
- **operator_id**: 0 unique values

### Label Distribution
**health_label**:
**stress_type**:
**label_evidence**:
**species**:

### Feature Availability
- **Optical**: red_raw, nir_raw, red_dark, nir_dark, red_reference, nir_reference, red_reflectance, nir_reflectance, ndvi
- **Environmental**: temperature_c, humidity_pct, soil_moisture_raw, soil_moisture_pct, ambient_light_raw
- **Wavelength info**: Red (~660nm), NIR (~850nm) implied by column names; explicit documentation required
- **Units documented**: Not explicitly documented in CSV
- **Calibration status**: Reference measurements present; calibration procedure verification required

### Provenance & Verification
- **Vikāsa hardware measurements**: No / Not documented
- **Labels verified**: No / Not documented
- **Suitable for supervised ML**: No
- **Exclusion reason**: No health/stress labels; Labels not verified (label_evidence missing); NDVI not available from calibrated reflectance

### Warnings
- ⚠️ Header-only template; no data rows
- ⚠️ No verified labels for supervised training

---

## Key Questions Answered

### 1. What data can we use right now?
No datasets currently classified as HARDWARE_READY.

### 2. What data cannot be used for supervised ML?
- **vikasa_sensor_data_template.csv**: No health/stress labels; Labels not verified (label_evidence missing); NDVI not available from calibrated reflectance

### 3. What information is missing?
- Header-only template; no data rows
- No verified labels for supervised training

### 4. What exact data must we collect from Vikāsa hardware?
For each measurement session, the following must be captured and stored:

| Category | Required Fields | Notes |
|----------|----------------|-------|
| Identifiers | reading_id, plant_id, session_id, operator_id | UUID or project-defined schemes |
| Timestamp | timestamp (ISO 8601 UTC) | Timezone-aware |
| Raw optical | red_raw, nir_raw, red_dark, nir_dark, red_reference, nir_reference | ADC counts (0-65535 for 12-bit) |
| Calibrated | red_reflectance, nir_reflectance (0-100%) | Requires Spectralon/reference target under identical illumination |
| Derived | ndvi (-1 to 1) | Computed from calibrated reflectance only |
| Environmental | temperature_c, humidity_pct, soil_moisture_pct, ambient_light_raw | With units |
| Labels | health_label, stress_type, label_evidence, species | Evidence must be documented |


### 5. What label mapping work is required?
- No label mapping issues detected in current datasets

### 6. Criteria that must be satisfied before ML training begins

1. **Calibrated reflectance available**: Both `red_reflectance` and `nir_reflectance` present with reference measurements documented
2. **NDVI derived from calibrated values**: NDVI computed as `(NIR - Red) / (NIR + Red)` using reflectance, never raw ADC
3. **Verified labels**: Each `health_label` and `stress_type` has documented `label_evidence` (visual, lab assay, expert rating)
4. **Environmental context**: Temperature, humidity, soil moisture, ambient light captured alongside optical
5. **Provenance documented**: Source (Vikāsa hardware vs research spectrometer), calibration procedure, operator
6. **No dataset conflation**: Environmental, tomato spectroscopy, and supplementary spectral kept separate unless verified compatible
7. **Raw vs calibrated separation**: Raw ADC counts never mixed with calibrated outputs in same column
8. **Missing = blank**: Unmeasured values left empty, never filled with zero or -999
