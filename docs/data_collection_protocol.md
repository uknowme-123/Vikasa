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
