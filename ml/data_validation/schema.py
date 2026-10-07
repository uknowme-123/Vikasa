"""
Vikāsa Dataset Schema Validation

Validates that incoming data conforms to the Vikāsa sensor data schema.
Does NOT modify data. Only validates and reports issues.

REQUIRES REAL VIKĀSA HARDWARE DATA: No - schema validation works against the template.
Actual data validation requires collected Vikāsa hardware measurements.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from pathlib import Path
import pandas as pd
import numpy as np


# Vikāsa sensor data schema definition
EXPECTED_COLUMNS = [
    'reading_id', 'plant_id', 'session_id', 'timestamp', 'species', 'stress_type',
    'health_label', 'label_evidence', 'red_raw', 'nir_raw', 'red_dark', 'nir_dark',
    'red_reference', 'nir_reference', 'red_reflectance', 'nir_reflectance', 'ndvi',
    'temperature_c', 'humidity_pct', 'soil_moisture_raw', 'soil_moisture_pct',
    'ambient_light_raw', 'operator_id', 'notes'
]

# Column type expectations
COLUMN_TYPES = {
    'reading_id': 'string',
    'plant_id': 'string',
    'session_id': 'string',
    'timestamp': 'datetime',
    'species': 'string',
    'stress_type': 'string',
    'health_label': 'string',
    'label_evidence': 'string',
    'red_raw': 'numeric',
    'nir_raw': 'numeric',
    'red_dark': 'numeric',
    'nir_dark': 'numeric',
    'red_reference': 'numeric',
    'nir_reference': 'numeric',
    'red_reflectance': 'numeric',
    'nir_reflectance': 'numeric',
    'ndvi': 'numeric',
    'temperature_c': 'numeric',
    'humidity_pct': 'numeric',
    'soil_moisture_raw': 'numeric',
    'soil_moisture_pct': 'numeric',
    'ambient_light_raw': 'numeric',
    'operator_id': 'string',
    'notes': 'string',
}

# Valid ranges for numeric columns
VALID_RANGES = {
    'red_raw': (0, 65535),
    'nir_raw': (0, 65535),
    'red_dark': (0, 65535),
    'nir_dark': (0, 65535),
    'red_reference': (0, 65535),
    'nir_reference': (0, 65535),
    'red_reflectance': (0.0, 100.0),
    'nir_reflectance': (0.0, 100.0),
    'ndvi': (-1.0, 1.0),
    'temperature_c': (-50.0, 100.0),
    'humidity_pct': (0.0, 100.0),
    'soil_moisture_raw': (0, 65535),
    'soil_moisture_pct': (0.0, 100.0),
    'ambient_light_raw': (0, 65535),
}

# Required identifier columns (must not be null)
REQUIRED_IDENTIFIERS = ['reading_id', 'plant_id', 'session_id', 'operator_id']

# Required timestamp column
TIMESTAMP_COLUMN = 'timestamp'

# Label columns
LABEL_COLUMNS = ['health_label', 'stress_type', 'label_evidence', 'species']


@dataclass
class ValidationResult:
    """Result of schema validation."""
    valid: bool
    errors: List[str]
    warnings: List[str]
    row_count: int
    column_count: int
    missing_columns: List[str]
    extra_columns: List[str]


def validate_schema(df: pd.DataFrame) -> ValidationResult:
    """
    Validate DataFrame against Vikāsa sensor data schema.
    
    Args:
        df: DataFrame to validate
        
    Returns:
        ValidationResult with validation details
    """
    errors = []
    warnings = []
    
    # Check row count
    row_count = len(df)
    if row_count == 0:
        warnings.append("DataFrame has 0 rows (header-only or empty)")
    
    # Check columns
    column_count = len(df.columns)
    missing_columns = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    extra_columns = [c for c in df.columns if c not in EXPECTED_COLUMNS]
    
    if missing_columns:
        errors.append(f"Missing required columns: {missing_columns}")
    if extra_columns:
        warnings.append(f"Extra columns not in schema: {extra_columns}")
    
    # Check required identifiers
    for col in REQUIRED_IDENTIFIERS:
        if col in df.columns:
            null_count = df[col].isnull().sum()
            if null_count > 0:
                errors.append(f"Required identifier '{col}' has {null_count} null values")
    
    # Check timestamp column
    if TIMESTAMP_COLUMN in df.columns:
        null_ts = df[TIMESTAMP_COLUMN].isnull().sum()
        if null_ts > 0:
            errors.append(f"Timestamp column has {null_ts} null values")
        else:
            # Try parsing timestamps
            try:
                pd.to_datetime(df[TIMESTAMP_COLUMN], utc=True)
            except Exception as e:
                errors.append(f"Timestamp column contains unparseable values: {e}")
    
    # Check label columns
    label_present = [c for c in LABEL_COLUMNS if c in df.columns]
    if label_present:
        for col in label_present:
            null_count = df[col].isnull().sum()
            if null_count == row_count and row_count > 0:
                warnings.append(f"Label column '{col}' has all null values")
    
    # Validate numeric ranges
    for col, (min_val, max_val) in VALID_RANGES.items():
        if col in df.columns:
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            # Check for non-finite values
            non_finite = (~np.isfinite(numeric_series)).sum()
            if non_finite > 0:
                errors.append(f"Column '{col}' has {non_finite} non-finite values (NaN/inf)")
            # Check range
            out_of_range = ((numeric_series < min_val) | (numeric_series > max_val)).sum()
            if out_of_range > 0:
                errors.append(f"Column '{col}' has {out_of_range} values outside valid range [{min_val}, {max_val}]")
    
    # Check NDVI consistency (if both reflectance columns present)
    if 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns and 'ndvi' in df.columns:
        # Only check rows where both reflectances are available
        mask = df['red_reflectance'].notna() & df['nir_reflectance'].notna()
        if mask.any():
            red = pd.to_numeric(df.loc[mask, 'red_reflectance'], errors='coerce')
            nir = pd.to_numeric(df.loc[mask, 'nir_reflectance'], errors='coerce')
            ndvi = pd.to_numeric(df.loc[mask, 'ndvi'], errors='coerce')
            # Compute expected NDVI
            expected = (nir - red) / (nir + red)
            # Compare where NDVI is also available
            ndvi_mask = ndvi.notna()
            if ndvi_mask.any():
                diff = (ndvi[ndvi_mask] - expected[ndvi_mask]).abs()
                inconsistent = (diff > 0.01).sum()  # Allow small floating point difference
                if inconsistent > 0:
                    warnings.append(f"NDVI inconsistent with reflectance values in {inconsistent} rows (diff > 0.01)")
    
    valid = len(errors) == 0
    
    return ValidationResult(
        valid=valid,
        errors=errors,
        warnings=warnings,
        row_count=row_count,
        column_count=column_count,
        missing_columns=missing_columns,
        extra_columns=extra_columns,
    )


def validate_csv_file(filepath: Path) -> ValidationResult:
    """
    Validate a CSV file against Vikāsa schema.
    
    Args:
        filepath: Path to CSV file
        
    Returns:
        ValidationResult
    """
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        return ValidationResult(
            valid=False,
            errors=[f"Failed to read CSV: {e}"],
            warnings=[],
            row_count=0,
            column_count=0,
            missing_columns=EXPECTED_COLUMNS,
            extra_columns=[],
        )
    return validate_schema(df)


def validate_training_readiness(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check if DataFrame is suitable for supervised ML training.
    
    REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - this checks actual data readiness.
    
    Args:
        df: DataFrame to check
        
    Returns:
        Dict with readiness assessment
    """
    result = validate_schema(df)
    
    # Additional ML readiness checks
    ml_warnings = []
    ml_errors = []
    
    # Need calibrated reflectance for NDVI
    if 'red_reflectance' not in df.columns or 'nir_reflectance' not in df.columns:
        ml_errors.append("Missing calibrated reflectance columns (red_reflectance, nir_reflectance)")
    else:
        calibrated_rows = df['red_reflectance'].notna() & df['nir_reflectance'].notna()
        if calibrated_rows.sum() == 0:
            ml_errors.append("No rows with both red_reflectance and nir_reflectance available")
    
    # Need verified labels
    if 'health_label' not in df.columns:
        ml_errors.append("Missing health_label column")
    elif df['health_label'].isnull().all():
        ml_errors.append("health_label column exists but all values are null")
    elif 'label_evidence' not in df.columns:
        ml_warnings.append("label_evidence column missing - label verification not documented")
    elif df['label_evidence'].isnull().all():
        ml_warnings.append("label_evidence column exists but all values are null - labels unverified")
    
    # Need environmental features
    env_cols = ['temperature_c', 'humidity_pct', 'soil_moisture_pct', 'ambient_light_raw']
    missing_env = [c for c in env_cols if c not in df.columns or df[c].isnull().all()]
    if missing_env:
        ml_warnings.append(f"Environmental features missing or all null: {missing_env}")
    
    # NDVI availability
    if 'ndvi' not in df.columns or df['ndvi'].isnull().all():
        ml_warnings.append("NDVI column missing or all null")
    
    # Check for actual Vikāsa hardware provenance (if notes/operator_id indicates)
    is_vikasa_hardware = False
    if 'notes' in df.columns:
        is_vikasa_hardware = df['notes'].astype(str).str.contains('Vikāsa|vikasa|VIKASA', case=False).any()
    if 'operator_id' in df.columns:
        is_vikasa_hardware = is_vikasa_hardware or df['operator_id'].astype(str).str.contains('VIKASA|vikasa', case=False).any()
    
    if not is_vikasa_hardware:
        ml_warnings.append("Data does not appear to be from Vikāsa hardware (no provenance in notes/operator_id)")
    
    ready = len(result.errors) == 0 and len(ml_errors) == 0
    
    return {
        'ready_for_training': ready,
        'schema_valid': result.valid,
        'schema_errors': result.errors,
        'schema_warnings': result.warnings,
        'ml_errors': ml_errors,
        'ml_warnings': ml_warnings,
        'is_vikasa_hardware': is_vikasa_hardware,
        'row_count': result.row_count,
    }