# Vikāsa – Data & Machine Learning

## 1. Data Collection Protocol

Proposed workflow for collecting consistent, reproducible measurements:
1. Select a target plant or sample area.
2. Record plant metadata, environment and timestamp.
3. Capture reflectance and environmental readings.
4. Store raw measurements in a structured format.
5. Perform validation and quality checks.
6. Generate derived features for analysis.

## 2. Dataset Schema

The CSV template `vikasa_sensor_data_template.csv` defines 24 columns:

| Group | Columns |
|-------|---------|
| Identifiers | reading_id, plant_id, session_id, timestamp, operator_id |
| Labels (set by humans) | species, stress_type, health_label, label_evidence |
| Raw optical | red_raw, nir_raw, red_dark, nir_dark, red_reference, nir_reference |
| Calibrated optical | red_reflectance, nir_reflectance, ndvi |
| Environmental | temperature_c, humidity_pct, soil_moisture_raw, soil_moisture_pct, ambient_light_raw |
| Other | notes |

**Data rules:**
- A blank value means "not measured"; never use 0, NA or −999.
- Raw and calibrated values are always kept in separate columns.
- NDVI is calculated **only** from calibrated reflectance.
- Every `health_label` must have `label_evidence` (e.g. visual inspection, lab assay).

## 3. Folder Structure

| Folder | Content |
|--------|---------|
| `data/raw/` | Unprocessed sensor output |
| `data/processed/` | Cleaned and derived datasets |
| `data/sample/` | Example and reference records |
| `data/templates/` | CSV templates |

## 4. ML Pipeline Structure

| Module | Purpose |
|--------|---------|
| `ml/data_validation/` | Schema, missing-value and numeric checks |
| `ml/preprocessing/` | Filtering, scaling, train/test splitting |
| `ml/features/` | Optical and environmental feature extraction |
| `ml/training/` | Model training |
| `ml/evaluation/` | Metrics (accuracy, F1, confusion matrix) |
| `ml/export/` | Model export for deployment (e.g. TinyML) |

## 5. ML Readiness Status

| Component | Status |
|-----------|--------|
| Software pipeline | Ready |
| Preprocessing, training code, evaluation, export | Possible once reference data is added |
| Feature engineering | Requires Vikāsa hardware data |
| Final model training and validation | Requires calibrated hardware data with verified labels |

**Current situation:** no hardware data has been collected yet, so no model is trained. The pipeline code structure is ready.

## 6. Next Steps

1. Add reference datasets to develop and test the pipeline.
2. Collect Vikāsa hardware data following the schema.
3. Document the calibration procedure.
4. Collect verified health labels.
5. Train and validate the model on real Vikāsa data.
6. Convert the model to TinyML for on-device inference on the ESP32.
