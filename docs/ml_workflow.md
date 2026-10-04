# Machine Learning Workflow

This document describes the proposed ML workflow for Vikāsa. It is a planning document for the eventual training and evaluation pipeline and should not be mistaken for an implemented or tested model.

## Objective

The intended goal is to use optical and environmental measurements to estimate plant stress conditions. The exact modeling approach remains to be determined by data exploration and validation.

## Proposed workflow stages

### 1. Data validation
- Check sensor completeness and timestamps.
- Identify missing or corrupt readings.
- Flag outlier conditions that may require review.

### 2. Preprocessing
- Normalize or standardize sensor values if appropriate.
- Remove invalid records and handle missing data.
- Prepare time-aligned input data from reflectance and environment observations.

### 3. Feature engineering
- Derive features from red and NIR reflectance values.
- Combine optical features with environmental context.
- Assess whether ratio-based or index-based features are appropriate.

### 4. Training
- Define supervised, unsupervised, or threshold-based modeling approaches as needed.
- Split data into training and validation subsets.
- Track experiment parameters and versioned data snapshots.

### 5. Evaluation
- Assess model performance with appropriate metrics.
- Review classification or regression quality against expected plant-condition labels.
- Validate not only accuracy, but also robustness under sensor variability.

### 6. Export and deployment
- Package the trained model in a deployment-friendly format.
- Ensure compatibility with the edge or backend inference path.
- Maintain the distinction between experiment artifacts and production-ready outputs.

## Proposed repository structure

- `ml/data_validation/` — quality checks and data validation logic
- `ml/preprocessing/` — cleaning, scaling, and normalization routines
- `ml/features/` — feature extraction and engineering logic
- `ml/training/` — model training scripts and experiment definitions
- `ml/evaluation/` — performance metrics and assessment dashboards
- `ml/export/` — model export and packaging
- `ml/models/` — trained model artifacts and metadata

## Open technical decisions

The project has not yet determined:

- Whether the task is classification, regression, or threshold-based assessment
- Which stress indicators will be labeled in training data
- The final red/NIR feature set and environmental covariates
- Whether inference runs at the edge, in the backend, or both
- The model size, latency, and deployment constraints for ESP32 or edge hardware

## Validation statement

No training, evaluation, or model performance claims are included in this documentation. Any future model results must be added only after proper data collection, validation, and review.
