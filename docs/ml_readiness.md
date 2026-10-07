# Vikāsa ML Pipeline Readiness Assessment

**Generated**: 2026-10-05
**Basis**: `docs/dataset_audit.md` + `docs/dataset_eligibility.md` + workspace inventory
**Constraint**: No model training; assessment only

---

## Current Data Reality

| Asset | Status |
|-------|--------|
| Vikāsa hardware data | **None collected** |
| Reference datasets (5) | **Not in workspace** |
| Template CSV | Present (0 rows, 24 columns) |
| ML-suitable data | **None** |

---

## ML Pipeline Component Readiness

| # | Component | Classification | Explanation |
|---|-----------|----------------|-------------|
| 1 | **Software pipeline development** | **READY** | Flask API, database schema, CI/CD, model registry, experiment tracking, Docker containers, and deployment scripts can be built without data. Code structure, interfaces, and tests can be implemented against the schema. |
| 2 | **Data preprocessing pipeline** | **POSSIBLE_WITH_REFERENCE_DATA** | Schema validation, missing-value handling, NDVI calculation from calibrated reflectance, unit conversion, and feature scaling logic can be implemented and unit-tested using the template schema. Requires reference data (even non-Vikāsa) for integration testing of column mapping, dtype coercion, and edge cases (missing values, outliers). Without any reference data, only schema-level tests are possible. |
| 3 | **Feature engineering** | **REQUIRES_HARDWARE_DATA** | Feature selection, spectral indices beyond NDVI (e.g., EVI, SAVI), temporal aggregation, sensor-fusion features, and domain-specific transforms require actual spectral response curves, noise profiles, and environmental covariation from Vikāsa hardware. Reference spectrometer data is **not** interchangeable (different spectral response, illumination geometry, SNR). Cannot validate feature relevance without compatible measurements. |
| 4 | **Model training code** | **POSSIBLE_WITH_REFERENCE_DATA** | Model architecture, loss functions, training loops, hyperparameter search frameworks, and MLflow integration can be written and syntax-checked. Requires reference data (even synthetic or non-Vikāsa) for shape validation, gradient flow tests, and overfitting checks. Final architecture decisions (input dims, regularization) depend on Vikāsa data statistics. |
| 5 | **Model evaluation code** | **POSSIBLE_WITH_REFERENCE_DATA** | Metric computation (accuracy, F1, confusion matrix, calibration curves), cross-validation splits, and reporting templates can be implemented. Requires reference data with verified labels for end-to-end test of evaluation pipeline. Cannot validate metric behavior or threshold selection without labeled data. |
| 6 | **Model export/TinyML conversion pipeline** | **POSSIBLE_WITH_REFERENCE_DATA** | ONNX export, TensorFlow Lite conversion, quantization-aware training stubs, ESP32 memory profiling scripts, and firmware integration tests can be built. Requires a trained model artifact (even from reference data) to validate conversion, quantization error bounds, and inference latency on target hardware. |
| 7 | **Final model training** | **REQUIRES_HARDWARE_DATA** | **Cannot proceed.** Training a production Vikāsa model requires: (a) calibrated reflectance from Vikāsa BPW34+LED system, (b) verified health/stress labels with documented evidence, (c) environmental covariation from same hardware, (d) sufficient sample size per class. No proxy data (research spectrometer, synthetic, public datasets) satisfies Vikāsa measurement compatibility requirements. |
| 8 | **Final model validation** | **REQUIRES_HARDWARE_DATA** | **Cannot proceed.** Validation requires: (a) held-out Vikāsa hardware data with verified labels, (b) field-deployment testing on actual ESP32, (c) confusion matrix per stress type, (d) calibration curves, (e) drift monitoring baseline. No substitute data satisfies provenance requirements. |

---

## Summary Matrix

| Component | Classification | Blocker |
|-----------|----------------|---------|
| 1. Software pipeline development | READY | None |
| 2. Data preprocessing pipeline | POSSIBLE_WITH_REFERENCE_DATA | No reference data in workspace |
| 3. Feature engineering | REQUIRES_HARDWARE_DATA | No Vikāsa spectral response data |
| 4. Model training code | POSSIBLE_WITH_REFERENCE_DATA | No reference data for shape/gradient tests |
| 5. Model evaluation code | POSSIBLE_WITH_REFERENCE_DATA | No labeled reference data |
| 6. Model export/TinyML pipeline | POSSIBLE_WITH_REFERENCE_DATA | No model artifact to convert |
| 7. Final model training | REQUIRES_HARDWARE_DATA | No Vikāsa hardware data |
| 8. Final model validation | REQUIRES_HARDWARE_DATA | No Vikāsa hardware validation set |

---

## Critical Dependencies

| Need | Status | Required For |
|------|--------|--------------|
| Reference datasets in `data/raw/source/` | **Missing** | Items 2, 4, 5, 6 |
| Vikāsa hardware data in `data/raw/hardware/` | **Missing** | Items 3, 7, 8 |
| Verified labels with `label_evidence` | **Missing** | Items 3, 5, 7, 8 |
| Calibration procedure documented | **Missing** | Items 2, 3, 7 |

---

## Recommended Next Steps (in order)

1. **Add reference datasets** to `data/raw/source/` → unblocks items 2, 4, 5, 6
2. **Develop pipeline code** (items 1, 2, 4, 5, 6) against reference data
3. **Collect Vikāsa hardware data** per template schema → unblocks items 3, 7, 8
4. **Document calibration procedure** → required for preprocessing and feature engineering
5. **Collect verified labels** with `label_evidence` → required for supervised ML
5. **Train final model** only on verified Vikāsa hardware data
6. **Validate final model** only on held-out Vikāsa hardware data

---

## Bottom Line

| Category | Count |
|----------|-------|
| READY | 1 |
| POSSIBLE_WITH_REFERENCE_DATA | 4 |
| REQUIRES_HARDWARE_DATA | 3 |
| NOT_SUPPORTED_BY_CURRENT_DATA | 0 |

**Final model training (7) and validation (8) are blocked until actual Vikāsa hardware data is collected with verified labels and documented calibration.** Pipeline development (1, 2, 4, 5, 6) can proceed once reference datasets are added to the workspace. Feature engineering (3) requires actual Vikāsa hardware spectral characterization.