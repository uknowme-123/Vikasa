# Data Collection Protocol

This document defines the proposed data collection process for the Vikāsa project. It is intended to guide future implementation and does not describe a completed or validated dataset.

## Objectives

The goal is to collect plant-condition measurements in a consistent, reproducible way so they can later support preprocessing, feature engineering, and ML workflow development.

## Proposed measurement workflow

1. Select a target plant or sample area.
2. Record plant metadata, environment, and timestamp.
3. Capture reflectance and environmental readings.
4. Store raw measurements in a structured format.
5. Perform validation and quality checks.
6. Generate derived features for downstream analysis.

## Data categories

### Raw data
- Reflectance readings
- Environmental sensor values
- Device metadata and timestamps
- Sample identifiers and location notes

### Processed data
- Cleaned and normalized records
- Filtered feature vectors
- Derived stress indicators
- Aggregated time-series summaries

### Sample and reference data
- Labeled examples for training or evaluation
- Control observations and baseline samples
- Metadata used for experiment tracking

## Proposed folder usage

- `data/raw/` — unprocessed sensor and acquisition output
- `data/processed/` — cleaned and derived datasets
- `data/sample/` — example or reference records
- `data/templates/` — data format templates for collection and export

## Quality expectations

The protocol should eventually enforce:

- Timestamp consistency
- Complete metadata for each reading
- Valid range checks for sensor values
- Device health and sampling-state tracking
- Distinction between raw measurements and derived features

## Pending decisions

The final collection protocol still needs decisions on:

- Sampling frequency and recording cadence
- Environmental metadata requirements
- Labeling strategy for healthy and stressed plants
- Data retention and archival policy
- File naming conventions and schema versioning
- Whether edge-level storage or cloud-first storage is preferred

## Validation note

This protocol is a proposal for future use. It is not a documentation of a dataset that has already been collected, labeled, or validated.

---

## Sensor Data Schema (CSV Template)

The canonical sensor data template is located at `data/templates/vikasa_sensor_data_template.csv`. It defines the header row for all Vikāsa sensor recordings. Do not add fabricated readings to the template; it is header-only.

### Column Definitions

| Column | Type | Description | Units / Format | Notes |
|--------|------|-------------|----------------|-------|
| reading_id | string | Unique identifier for each sensor reading | UUID or project-defined scheme | Required; must be globally unique |
| plant_id | string | Identifier for the specific plant or sample | Project-defined scheme | Required; links to plant metadata |
| session_id | string | Session/grouping identifier for a collection event | Project-defined scheme | Required; enables batch queries |
| timestamp | datetime (ISO 8601) | Time of measurement acquisition | UTC, e.g., `2026-10-04T10:30:00Z` | Required; must be timezone-aware |
| species | string | Plant species or variety name | Free text or controlled vocabulary | Required if known; leave blank if unknown |
| stress_type | string | Type of stress being studied or observed | Controlled vocabulary (e.g., `drought`, `nutrient`, `salinity`, `healthy`, `unknown`) | Required for labeled data; blank for unlabeled |
| health_label | string | Ground-truth or operator-assigned health state | Controlled vocabulary (e.g., `healthy`, `mild`, `moderate`, `severe`, `unknown`) | Required for supervised workflows; blank if unavailable |
| label_evidence | string | Basis for the health_label | Free text (e.g., `visual inspection`, `lab assay`, `expert rating`, `sensor threshold`) | Required when health_label is provided |
| red_raw | integer | Raw ADC count from red channel (illuminated) | ADC counts (0–4095 for 12-bit) | Uncalibrated; depends on circuit, gain, integration time |
| nir_raw | integer | Raw ADC count from NIR channel (illuminated) | ADC counts (0–4095 for 12-bit) | Uncalibrated; depends on circuit, gain, integration time |
| red_dark | integer | Raw ADC count from red channel (dark / LED off) | ADC counts (0–4095 for 12-bit) | Dark current / offset reference |
| nir_dark | integer | Raw ADC count from NIR channel (dark / LED off) | ADC counts (0–4095 for 12-bit) | Dark current / offset reference |
| red_reference | integer | Raw ADC count from red channel (reference target) | ADC counts (0–4095 for 12-bit) | White/reflectance standard under same illumination |
| nir_reference | integer | Raw ADC count from NIR channel (reference target) | ADC counts (0–4095 for 12-bit) | White/reflectance standard under same illumination |
| red_reflectance | float | Calibrated reflectance for red band | Unitless (0.0–1.0) or percentage (0–100) | **Requires calibration procedure**; leave blank if uncalibrated |
| nir_reflectance | float | Calibrated reflectance for NIR band | Unitless (0.0–1.0) or percentage (0–100) | **Requires calibration procedure**; leave blank if uncalibrated |
| ndvi | float | Normalized Difference Vegetation Index | Unitless (−1.0 to 1.0) | **Must not be calculated from arbitrary raw ADC counts**; only from calibrated reflectance; leave blank if unavailable |
| temperature_c | float | Ambient air temperature | Degrees Celsius (°C) | Leave blank if sensor unavailable |
| humidity_pct | float | Relative humidity | Percentage (%) | Leave blank if sensor unavailable |
| soil_moisture_raw | integer | Raw ADC count from soil moisture sensor | ADC counts (0–4095 for 12-bit) | Uncalibrated; sensor-specific |
| soil_moisture_pct | float | Calibrated volumetric water content | Percentage (%) | **Requires sensor-specific calibration**; leave blank if uncalibrated |
| ambient_light_raw | integer | Raw ADC count from ambient light sensor | ADC counts (0–4095 for 12-bit) | Uncalibrated; optional |
| operator_id | string | Identifier for the person or device collecting data | Project-defined scheme | Required for traceability |
| notes | string | Free-form observations or anomalies | Free text | Optional; leave blank if none |

### Important Conventions

1. **Missing or unmeasured values**: Leave the field blank (empty string). Do **not** write `0`, `null`, `NA`, or `-999`. A blank field explicitly means "not measured" or "not available."

2. **Raw vs. calibrated separation**: Raw ADC counts (`*_raw`, `*_dark`, `*_reference`) are always recorded. Calibrated outputs (`*_reflectance`, `*_pct`, `ndvi`) are derived columns that **must** remain blank until a documented calibration procedure has been applied. Mixing raw and calibrated values in the same column is prohibited.

3. **Reflectance calibration**: `red_reflectance` and `nir_reflectance` require an appropriate calibration procedure using a reference target of known reflectance (e.g., Spectralon panel or calibrated white standard) measured under identical illumination and geometry as the plant target. The procedure must be documented in `hardware/calibration/` before these fields are populated.

4. **NDVI calculation**: NDVI = (NIR − Red) / (NIR + Red) using **calibrated reflectance values only**. It must **not** be computed from raw ADC counts, dark-subtracted counts, or reference-normalized values without full radiometric calibration. If calibrated reflectance is unavailable, leave `ndvi` blank.

5. **Unconfirmed hardware details**: The final photodiode circuit, pin assignments, ADC resolution, gain settings, integration times, LED wavelengths, illumination geometry, and sensor-specific calibration constants are **not yet confirmed**. This schema accommodates that uncertainty by keeping raw and calibrated columns separate and by not prescribing units for raw values beyond "ADC counts."

6. **Schema versioning**: Future revisions to this template should increment a schema version (e.g., `v1.0`, `v1.1`) recorded in the file header or an accompanying manifest.
