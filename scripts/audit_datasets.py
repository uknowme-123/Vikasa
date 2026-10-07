#!/usr/bin/env python3
"""
Vikāsa Dataset Audit Pipeline

Reproducible audit of plant stress monitoring datasets.
Does not modify source files. Produces structured markdown report.

Usage:
    python scripts/audit_datasets.py --data-dir data --output docs/dataset_audit.md
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import numpy as np


# Classification statuses
class Status:
    HARDWARE_READY = "HARDWARE_READY"
    SUPERVISED_TRAINING_CANDIDATE = "SUPERVISED_TRAINING_CANDIDATE"
    EXPLORATORY_SPECTRAL_ONLY = "EXPLORATORY_SPECTRAL_ONLY"
    ENVIRONMENTAL_ONLY = "ENVIRONMENTAL_ONLY"
    LABEL_MAPPING_REQUIRED = "LABEL_MAPPING_REQUIRED"
    PROVENANCE_OR_CALIBRATION_REQUIRED = "PROVENANCE_OR_CALIBRATION_REQUIRED"
    TEMPLATE_ONLY = "TEMPLATE_ONLY"


EXPECTED_CSV_COLUMNS = [
    'reading_id', 'plant_id', 'session_id', 'timestamp', 'species', 'stress_type',
    'health_label', 'label_evidence', 'red_raw', 'nir_raw', 'red_dark', 'nir_dark',
    'red_reference', 'nir_reference', 'red_reflectance', 'nir_reflectance', 'ndvi',
    'temperature_c', 'humidity_pct', 'soil_moisture_raw', 'soil_moisture_pct',
    'ambient_light_raw', 'operator_id', 'notes'
]

OPTICAL_FEATURES = ['red_raw', 'nir_raw', 'red_dark', 'nir_dark', 'red_reference', 
                    'nir_reference', 'red_reflectance', 'nir_reflectance', 'ndvi']
ENVIRONMENTAL_FEATURES = ['temperature_c', 'humidity_pct', 'soil_moisture_raw', 
                           'soil_moisture_pct', 'ambient_light_raw']
IDENTIFIER_FIELDS = ['reading_id', 'plant_id', 'session_id', 'operator_id']
LABEL_FIELDS = ['health_label', 'stress_type', 'label_evidence', 'species']


def audit_csv(filepath: Path) -> Dict[str, Any]:
    """Audit a single CSV file and return structured results."""
    
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        return {
            "filename": filepath.name,
            "error": f"Failed to read CSV: {e}",
            "classification": [Status.PROVENANCE_OR_CALIBRATION_REQUIRED]
        }

    # Basic metrics
    row_count = len(df)
    col_count = len(df.columns)
    column_names = list(df.columns)
    
    # Missing values
    missing_pct = (df.isnull().sum() / row_count * 100).round(2).to_dict()
    
    # Duplicates
    duplicate_rows = df.duplicated().sum()
    
    # Unique identifiers
    unique_ids = {}
    for field in IDENTIFIER_FIELDS:
        if field in df.columns:
            unique_ids[field] = df[field].nunique()
    
    # Label distribution
    label_dist = {}
    for field in LABEL_FIELDS:
        if field in df.columns:
            label_dist[field] = df[field].value_counts().to_dict()
    
    # Feature availability
    optical_available = [f for f in OPTICAL_FEATURES if f in df.columns]
    env_available = [f for f in ENVIRONMENTAL_FEATURES if f in df.columns]
    
    # Wavelength info (heuristic)
    wavelength_info = "Not documented"
    if any(f in df.columns for f in ['red_raw', 'nir_raw', 'red_reflectance', 'nir_reflectance']):
        wavelength_info = "Red (~660nm), NIR (~850nm) implied by column names; explicit documentation required"
    
    # Units documentation
    units_documented = "Not explicitly documented in CSV"
    
    # Calibration/provenance
    has_calibrated = 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns
    has_raw = 'red_raw' in df.columns and 'nir_raw' in df.columns
    has_reference = 'red_reference' in df.columns and 'nir_reference' in df.columns
    
    calibration_status = "Unknown"
    if has_calibrated and has_raw and has_reference:
        calibration_status = "Reference measurements present; calibration procedure verification required"
    elif has_calibrated:
        calibration_status = "Calibrated values present; reference source undocumented"
    elif has_raw:
        calibration_status = "Raw ADC only; calibration required"
    else:
        calibration_status = "No optical data"
    
    # Vikāsa hardware check
    is_vikasa_hardware = False
    if 'notes' in df.columns:
        is_vikasa_hardware = df['notes'].astype(str).str.contains('Vikāsa|vikasa|VIKASA', case=False).any()
    if 'operator_id' in df.columns:
        is_vikasa_hardware = is_vikasa_hardware or df['operator_id'].astype(str).str.contains('VIKASA|vikasa', case=False).any()
    
    # Label verification
    labels_verified = False
    if 'label_evidence' in df.columns:
        labels_verified = df['label_evidence'].notna().any()
    
    # Classification logic
    classifications = []
    warnings = []
    
    # Template check
    if row_count == 0 and set(column_names) == set(EXPECTED_CSV_COLUMNS):
        classifications.append(Status.TEMPLATE_ONLY)
        warnings.append("Header-only template; no data rows")
    
    # Data presence checks
    has_optical = len(optical_available) > 0
    has_env = len(env_available) > 0
    has_labels = 'health_label' in df.columns and df['health_label'].notna().any()
    
    # Provenance/calibration
    if has_optical and not (has_calibrated and has_reference):
        classifications.append(Status.PROVENANCE_OR_CALIBRATION_REQUIRED)
        warnings.append("Optical data present but calibration reference missing or incomplete")
    
    # Environmental only
    if has_env and not has_optical:
        classifications.append(Status.ENVIRONMENTAL_ONLY)
    
    # Spectral only
    if has_optical and not has_env:
        classifications.append(Status.EXPLORATORY_SPECTRAL_ONLY)
    
    # Label mapping
    if has_labels and not labels_verified:
        classifications.append(Status.LABEL_MAPPING_REQUIRED)
        warnings.append("Labels present but evidence/source not documented")
    
    # Hardware ready
    if is_vikasa_hardware and has_calibrated and has_env and labels_verified:
        classifications.append(Status.HARDWARE_READY)
    
    # Training candidate
    if has_calibrated and has_env and has_labels and labels_verified:
        if not is_vikasa_hardware:
            classifications.append(Status.SUPERVISED_TRAINING_CANDIDATE)
            warnings.append("Suitable features and labels but Vikāsa hardware provenance not confirmed")
        else:
            classifications.append(Status.SUPERVISED_TRAINING_CANDIDATE)
    elif has_optical and has_env and not has_labels:
        classifications.append(Status.EXPLORATORY_SPECTRAL_ONLY)
        warnings.append("No verified labels for supervised training")
    
    # Deduplicate classifications
    classifications = list(dict.fromkeys(classifications))
    if not classifications:
        classifications.append(Status.PROVENANCE_OR_CALIBRATION_REQUIRED)
        warnings.append("Insufficient information to classify")
    
    # Supervised ML suitability
    suitable_for_ml = (
        has_calibrated and has_env and has_labels and labels_verified and
        'ndvi' in df.columns and df['ndvi'].notna().any()
    )
    
    exclusion_reason = None
    if not suitable_for_ml:
        reasons = []
        if not has_calibrated:
            reasons.append("No calibrated reflectance (red_reflectance, nir_reflectance)")
        if not has_env:
            reasons.append("No environmental features")
        if not has_labels:
            reasons.append("No health/stress labels")
        if not labels_verified:
            reasons.append("Labels not verified (label_evidence missing)")
        if 'ndvi' not in df.columns or not df['ndvi'].notna().any():
            reasons.append("NDVI not available from calibrated reflectance")
        exclusion_reason = "; ".join(reasons) if reasons else "Insufficient verified features/labels"
    
    return {
        "filename": filepath.name,
        "row_count": row_count,
        "col_count": col_count,
        "column_names": column_names,
        "missing_pct": missing_pct,
        "duplicate_rows": int(duplicate_rows),
        "unique_identifiers": unique_ids,
        "label_distribution": label_dist,
        "optical_features": optical_available,
        "environmental_features": env_available,
        "wavelength_info": wavelength_info,
        "units_documented": units_documented,
        "calibration_status": calibration_status,
        "is_vikasa_hardware": is_vikasa_hardware,
        "labels_verified": labels_verified,
        "suitable_for_ml": suitable_for_ml,
        "exclusion_reason": exclusion_reason,
        "classification": classifications,
        "warnings": warnings,
    }


def generate_report(results: List[Dict[str, Any]], output_path: Path) -> None:
    """Generate markdown audit report."""
    
    lines = [
        "# Vikāsa Dataset Audit Report",
        "",
        f"Generated: {pd.Timestamp.now().isoformat()}",
        f"Total datasets audited: {len(results)}",
        "",
        "## Classification Legend",
        "",
        "- **HARDWARE_READY**: Verified Vikāsa hardware measurements with calibrated reflectance and verified labels",
        "- **SUPERVISED_TRAINING_CANDIDATE**: Sufficient features and labels for ML, but hardware provenance may need confirmation",
        "- **EXPLORATORY_SPECTRAL_ONLY**: Optical/spectral data without verified labels or environmental context",
        "- **ENVIRONMENTAL_ONLY**: Environmental sensor data without optical measurements",
        "- **LABEL_MAPPING_REQUIRED**: Labels present but evidence/source undocumented",
        "- **PROVENANCE_OR_CALIBRATION_REQUIRED**: Optical data lacks calibration reference or provenance",
        "- **TEMPLATE_ONLY**: Header-only schema template, no data rows",
        "",
        "---",
        ""
    ]
    
    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| Dataset | Rows | Cols | Classification | ML Suitable | Key Warnings |")
    lines.append("|---------|------|------|----------------|-------------|--------------|")
    
    for r in results:
        if "error" in r:
            lines.append(f"| {r['filename']} | ERROR | - | - | - | {r['error']} |")
            continue
        
        class_str = ", ".join(r['classification'])
        warnings_str = "; ".join(r['warnings']) if r['warnings'] else "None"
        ml_str = "✅" if r.get('suitable_for_ml') else "❌"
        
        lines.append(f"| {r['filename']} | {r['row_count']} | {r['col_count']} | {class_str} | {ml_str} | {warnings_str} |")
    
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Detailed per-dataset sections
    for r in results:
        lines.append(f"## {r['filename']}")
        lines.append("")
        
        if "error" in r:
            lines.append(f"**Error**: {r['error']}")
            lines.append("")
            continue
        
        # Basic info
        lines.append(f"- **Rows**: {r['row_count']}")
        lines.append(f"- **Columns**: {r['col_count']}")
        lines.append(f"- **Column names**: {', '.join(r['column_names'])}")
        lines.append(f"- **Duplicate rows**: {r['duplicate_rows']}")
        lines.append(f"- **Classification**: {', '.join(r['classification'])}")
        lines.append("")
        
        # Missing values
        lines.append("### Missing Values (%)")
        missing_df = pd.DataFrame(list(r['missing_pct'].items()), columns=['Column', 'Missing %'])
        lines.append(missing_df.to_markdown(index=False))
        lines.append("")
        
        # Unique identifiers
        if r['unique_identifiers']:
            lines.append("### Unique Identifiers")
            for k, v in r['unique_identifiers'].items():
                lines.append(f"- **{k}**: {v} unique values")
            lines.append("")
        
        # Label distribution
        if r['label_distribution']:
            lines.append("### Label Distribution")
            for field, dist in r['label_distribution'].items():
                lines.append(f"**{field}**:")
                for label, count in dist.items():
                    lines.append(f"  - {label}: {count}")
            lines.append("")
        
        # Features
        lines.append("### Feature Availability")
        lines.append(f"- **Optical**: {', '.join(r['optical_features']) if r['optical_features'] else 'None'}")
        lines.append(f"- **Environmental**: {', '.join(r['environmental_features']) if r['environmental_features'] else 'None'}")
        lines.append(f"- **Wavelength info**: {r['wavelength_info']}")
        lines.append(f"- **Units documented**: {r['units_documented']}")
        lines.append(f"- **Calibration status**: {r['calibration_status']}")
        lines.append("")
        
        # Provenance
        lines.append("### Provenance & Verification")
        lines.append(f"- **Vikāsa hardware measurements**: {'Yes' if r['is_vikasa_hardware'] else 'No / Not documented'}")
        lines.append(f"- **Labels verified**: {'Yes' if r['labels_verified'] else 'No / Not documented'}")
        lines.append(f"- **Suitable for supervised ML**: {'Yes' if r['suitable_for_ml'] else 'No'}")
        if r['exclusion_reason']:
            lines.append(f"- **Exclusion reason**: {r['exclusion_reason']}")
        lines.append("")
        
        if r['warnings']:
            lines.append("### Warnings")
            for w in r['warnings']:
                lines.append(f"- ⚠️ {w}")
            lines.append("")
        
        lines.append("---")
        lines.append("")
    
    # Answers to key questions
    lines.append("## Key Questions Answered")
    lines.append("")
    
    # 1. What data can we use right now?
    ready = [r for r in results if Status.HARDWARE_READY in r.get('classification', [])]
    candidates = [r for r in results if Status.SUPERVISED_TRAINING_CANDIDATE in r.get('classification', [])]
    
    lines.append("### 1. What data can we use right now?")
    if ready:
        lines.append("**HARDWARE_READY (verified Vikāsa measurements)**:")
        for r in ready:
            lines.append(f"- {r['filename']}: {r['row_count']} rows, calibrated reflectance, verified labels")
    else:
        lines.append("No datasets currently classified as HARDWARE_READY.")
    
    if candidates:
        lines.append("")
        lines.append("**SUPERVISED_TRAINING_CANDIDATE (features + labels, provenance may need confirmation)**:")
        for r in candidates:
            lines.append(f"- {r['filename']}: {r['row_count']} rows, calibrated features, labels present")
    
    # 2. What cannot be used for supervised ML?
    lines.append("")
    lines.append("### 2. What data cannot be used for supervised ML?")
    excluded = [r for r in results if not r.get('suitable_for_ml', False) and 'error' not in r]
    for r in excluded:
        lines.append(f"- **{r['filename']}**: {r['exclusion_reason']}")
    
    # 3. What information is missing?
    lines.append("")
    lines.append("### 3. What information is missing?")
    all_warnings = []
    for r in results:
        all_warnings.extend(r.get('warnings', []))
    # Deduplicate
    unique_warnings = list(dict.fromkeys(all_warnings))
    for w in unique_warnings:
        lines.append(f"- {w}")
    
    # 4. What exact data must we collect from Vikāsa hardware?
    lines.append("")
    lines.append("### 4. What exact data must we collect from Vikāsa hardware?")
    lines.append("For each measurement session, the following must be captured and stored:")
    lines.append("")
    lines.append("| Category | Required Fields | Notes |")
    lines.append("|----------|----------------|-------|")
    lines.append("| Identifiers | reading_id, plant_id, session_id, operator_id | UUID or project-defined schemes |")
    lines.append("| Timestamp | timestamp (ISO 8601 UTC) | Timezone-aware |")
    lines.append("| Raw optical | red_raw, nir_raw, red_dark, nir_dark, red_reference, nir_reference | ADC counts (0-65535 for 12-bit) |")
    lines.append("| Calibrated | red_reflectance, nir_reflectance (0-100%) | Requires Spectralon/reference target under identical illumination |")
    lines.append("| Derived | ndvi (-1 to 1) | Computed from calibrated reflectance only |")
    lines.append("| Environmental | temperature_c, humidity_pct, soil_moisture_pct, ambient_light_raw | With units |")
    lines.append("| Labels | health_label, stress_type, label_evidence, species | Evidence must be documented |")
    lines.append("")
    
    # 5. Label mapping work
    lines.append("")
    lines.append("### 5. What label mapping work is required?")
    label_issues = [r for r in results if Status.LABEL_MAPPING_REQUIRED in r.get('classification', [])]
    if label_issues:
        for r in label_issues:
            lines.append(f"- **{r['filename']}**: Document `label_evidence` for each `health_label`/`stress_type` entry")
    else:
        lines.append("- No label mapping issues detected in current datasets")
    
    # 6. Criteria for ML training
    lines.append("")
    lines.append("### 6. Criteria that must be satisfied before ML training begins")
    lines.append("")
    lines.append("1. **Calibrated reflectance available**: Both `red_reflectance` and `nir_reflectance` present with reference measurements documented")
    lines.append("2. **NDVI derived from calibrated values**: NDVI computed as `(NIR - Red) / (NIR + Red)` using reflectance, never raw ADC")
    lines.append("3. **Verified labels**: Each `health_label` and `stress_type` has documented `label_evidence` (visual, lab assay, expert rating)")
    lines.append("4. **Environmental context**: Temperature, humidity, soil moisture, ambient light captured alongside optical")
    lines.append("5. **Provenance documented**: Source (Vikāsa hardware vs research spectrometer), calibration procedure, operator")
    lines.append("6. **No dataset conflation**: Environmental, tomato spectroscopy, and supplementary spectral kept separate unless verified compatible")
    lines.append("7. **Raw vs calibrated separation**: Raw ADC counts never mixed with calibrated outputs in same column")
    lines.append("8. **Missing = blank**: Unmeasured values left empty, never filled with zero or -999")
    lines.append("")
    
    # Write output
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Report written to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Audit Vikāsa datasets")
    parser.add_argument("--data-dir", type=Path, default=Path("data"), help="Directory containing CSV datasets")
    parser.add_argument("--output", type=Path, default=Path("docs/dataset_audit.md"), help="Output markdown report path")
    parser.add_argument("--include-templates", action="store_true", help="Include template files in audit")
    args = parser.parse_args()
    
    data_dir = args.data_dir
    if not data_dir.exists():
        print(f"Error: Data directory {data_dir} does not exist")
        sys.exit(1)
    
    # Find CSV files
    csv_files = list(data_dir.rglob("*.csv"))
    
    if not args.include_templates:
        # Exclude template files
        csv_files = [f for f in csv_files if "template" not in f.name.lower()]
    
    if not csv_files:
        print("No CSV files found to audit")
        # Still create report with just template
        csv_files = list(data_dir.rglob("vikasa_sensor_data_template.csv"))
    
    print(f"Found {len(csv_files)} CSV file(s) to audit")
    
    results = []
    for csv_file in csv_files:
        print(f"Auditing {csv_file}...")
        result = audit_csv(csv_file)
        results.append(result)
    
    # Ensure output directory exists
    args.output.parent.mkdir(parents=True, exist_ok=True)
    
    generate_report(results, args.output)
    
    # Print summary
    print("\n=== AUDIT SUMMARY ===")
    for r in results:
        if "error" in r:
            print(f"  {r['filename']}: ERROR - {r['error']}")
        else:
            print(f"  {r['filename']}: {r['row_count']} rows, {r['col_count']} cols, {', '.join(r['classification'])}")


if __name__ == "__main__":
    main()