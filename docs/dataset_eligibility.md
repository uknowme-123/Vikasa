# Vikāsa Dataset Eligibility Review (Final)

**Review Date**: 2026-10-05
**Basis**: `docs/dataset_audit.md`, `docs/ml_readiness.md`, workspace inventory (`data/` directory)
**Constraint**: Review ONLY datasets physically present in `data/` directory

---

## Workspace Dataset Inventory

| Dataset | Path | Status |
|---------|------|--------|
| vikasa_sensor_data_template.csv | `data/raw/hardware/vikasa_sensor_data_template.csv` | Present (header-only) |

**Missing from workspace** (not reviewed):
- plant_health_data.csv
- vikasa_master_source_data.csv
- vikasa_tomato_red_nir_unmapped.csv
- vikasa_tomato_red_nir_features_pending_labels.csv
- vikasa_spectral_supplement.csv

---

## Dataset Eligibility Review: vikasa_sensor_data_template.csv

| Field | Value |
|-------|-------|
| **Dataset name** | vikasa_sensor_data_template.csv |
| **Number of rows** | 0 (header-only) |
| **Number of columns** | 24 |
| **Current audit classification** | TEMPLATE_ONLY, EXPLORATORY_SPECTRAL_ONLY |
| **Contains actual Vikāsa hardware measurements** | No — template only |
| **Contains red measurements** | Column header only (`red_raw`, `red_dark`, `red_reference`, `red_reflectance`); no measurement values |
| **Contains NIR measurements** | Column header only (`nir_raw`, `nir_dark`, `nir_reference`, `nir_reflectance`); no measurement values |
| **Red/NIR measurement type** | NOT VERIFIED — no measurement data present; column names imply BPW34+LED schema but no data to verify |
| **Calibrated reflectance available** | No — column headers present (`red_reflectance`, `nir_reflectance`), no values |
| **NDVI available** | No — column header present (`ndvi`), no values |
| **Health/stress labels available** | Column headers present (`health_label`, `stress_type`, `label_evidence`, `species`), no values |
| **Labels verified** | Not applicable — no data rows |
| **Can be used for software pipeline development** | Yes — schema defines API contracts, column names, types for pipeline code |
| **Can be used for feature engineering testing** | No — no measurement data to test features against |
| **Can be used for exploratory analysis** | No — no data to explore |
| **Can be used for model development** | No — no data for model code testing |
| **Can be used for supervised training** | No — zero data rows, zero labels, zero measurements |
| **Can be used for final Vikāsa model training** | No — zero data rows, no measurements, no labels |

**Final Eligibility Category**: **D. EXCLUDE**

**Exact Reason**: Header-only template with 0 data rows. Contains Vikāsa sensor schema (24 columns matching BPW34+LED hardware specification) but zero measurement data, zero labels, zero provenance. Cannot be used for training, validation, exploratory analysis, or any analytical purpose.

**Required Verification/Action Before Possible Use**: None applicable — this is a schema template, not a dataset. Actual data must be collected from Vikāsa hardware per the schema and stored separately.

---

## Summary Table

| Dataset | Category | Possible Use | Main Limitation |
|---------|----------|--------------|-----------------|
| vikasa_sensor_data_template.csv | D. EXCLUDE | Schema reference only; API contract definition | Header-only template; 0 data rows, 0 measurements, 0 labels, 0 provenance |

---

## Notes

1. **No other datasets exist** in the workspace. The five reference datasets referenced in prior planning (plant_health_data.csv, vikasa_master_source_data.csv, vikasa_tomato_red_nir_unmapped.csv, vikasa_tomato_red_nir_features_pending_labels.csv, vikasa_spectral_supplement.csv) are **not present** in the workspace and were not reviewed.

2. **Critical Vikāsa Rules Applied**:
   - Raw ADC counts ≠ reflectance — template correctly separates `*_raw` from `*_reflectance` columns
   - NDVI requires calibrated reflectance — template has `ndvi` column but correctly requires `red_reflectance` + `nir_reflectance` for calculation
   - No label inference — no data rows exist to infer from
   - No dataset conflation — only one dataset exists
   - Missing = blank — template has no data to fill

3. **Template Purpose**: This file correctly serves as a **schema contract** defining the 24-column structure for future Vikāsa hardware data collection. It defines:
   - Identifiers: `reading_id`, `plant_id`, `session_id`, `operator_id`
   - Timestamp: `timestamp` (ISO 8601 UTC)
   - Raw optical: `red_raw`, `nir_raw`, `red_dark`, `nir_dark`, `red_reference`, `nir_reference`
   - Calibrated: `red_reflectance`, `nir_reflectance`, `ndvi`
   - Environmental: `temperature_c`, `humidity_pct`, `soil_moisture_raw`, `soil_moisture_pct`, `ambient_light_raw`
   - Labels: `health_label`, `stress_type`, `label_evidence`, `species`
   - Metadata: `species`, `notes`

4. **Next Steps for Data Collection**:
   - Collect actual Vikāsa BPW34+LED hardware measurements per this schema
   - Store collected data in `data/raw/hardware/` with dated filenames
   - Document calibration procedure (Spectralon reference under identical illumination)
   - Capture `label_evidence` for each `health_label`/`stress_type`
   - Do not mix research spectrometer data with Vikāsa hardware data

---

## Conclusion

**Only one dataset exists in the workspace**: the Vikāsa sensor data template.

**Eligibility**: **D. EXCLUDE** for all ML purposes.

**Only legitimate use**: Schema reference for pipeline code development and future data collection specification.

**No dataset in the workspace supports**:
- Feature engineering testing
- Exploratory analysis
- Model development
- Supervised training
- Final Vikāsa model training

**Next action required**: Collect actual Vikāsa hardware data per this template schema before any ML pipeline stages beyond software infrastructure can proceed.