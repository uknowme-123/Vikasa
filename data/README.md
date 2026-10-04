# Data

This directory defines the intended data organization for Vikāsa. It is a structure for future collection, validation, and analysis work rather than an active dataset repository.

## Planned data groups

- `templates/` — structure templates for incoming sensor and model data
- `raw/` — unprocessed sensor outputs and acquisition records
- `processed/` — cleaned, normalized, and derived results
- `sample/` — example records and reference data for testing workflows

## Proposed workflow

1. Capture raw data from sensors or devices.
2. Validate quality and completeness.
3. Move verified records into processed storage.
4. Use sample or reference files for pipeline testing.
5. Keep raw data separate from derived outputs.

## Pending decisions

- Exact schema for raw observations
- File naming policy and timestamps
- Retention and archival approach
- Labeling conventions for plant stress records
- Metadata standards for environmental context

## Status

No final dataset or validated measurements are included in this repository.
