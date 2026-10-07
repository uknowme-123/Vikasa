"""
Vikāsa Numeric Type Validation

Validates numeric columns for finite values, valid ranges, and correct types.
Does NOT convert or coerce values. Only validates and reports.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - actual type validation requires real data.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np


@dataclass
class NumericValidationResult:
    """Result of numeric type validation."""
    column: str
    total_values: int
    numeric_count: int
    non_numeric_count: int
    non_finite_count: int
    out_of_range_count: int
    min_value: Optional[float]
    max_value: Optional[float]
    mean_value: Optional[float]
    std_value: Optional[float]
    errors: List[str]
    warnings: List[str]


# Expected numeric columns with valid ranges
NUMERIC_COLUMNS = {
    'red_raw': (0, 65535, 'ADC counts (12-bit)'),
    'nir_raw': (0, 65535, 'ADC counts (12-bit)'),
    'red_dark': (0, 65535, 'ADC counts (12-bit)'),
    'nir_dark': (0, 65535, 'ADC counts (12-bit)'),
    'red_reference': (0, 65535, 'ADC counts (12-bit)'),
    'nir_reference': (0, 65535, 'ADC counts (12-bit)'),
    'red_reflectance': (0.0, 100.0, 'Percentage (%)'),
    'nir_reflectance': (0.0, 100.0, 'Percentage (%)'),
    'ndvi': (-1.0, 1.0, 'Unitless index'),
    'temperature_c': (-50.0, 100.0, 'Celsius'),
    'humidity_pct': (0.0, 100.0, 'Percentage (%)'),
    'soil_moisture_raw': (0, 65535, 'ADC counts (12-bit)'),
    'soil_moisture_pct': (0.0, 100.0, 'Percentage (%)'),
    'ambient_light_raw': (0, 65535, 'ADC counts (12-bit)'),
}


def validate_numeric_column(series: pd.Series, column_name: str, 
                            expected_range: Tuple[float, float]) -> NumericValidationResult:
    """
    Validate a single numeric column.
    
    DOES NOT CONVERT OR COERCE VALUES.
    
    Args:
        series: Pandas Series to validate
        column_name: Name of column
        expected_range: (min, max) tuple of valid values
        
    Returns:
        NumericValidationResult
    """
    errors = []
    warnings = []
    
    total_values = len(series)
    
    # Try to convert to numeric
    numeric_series = pd.to_numeric(series, errors='coerce')
    numeric_count = numeric_series.notna().sum()
    non_numeric_count = total_values - numeric_count
    
    if non_numeric_count > 0:
        errors.append(f"{non_numeric_count} non-numeric values")
    
    # Check for non-finite values (NaN, inf, -inf)
    finite_mask = np.isfinite(numeric_series)
    non_finite_count = (~finite_mask).sum()
    if non_finite_count > 0:
        errors.append(f"{non_finite_count} non-finite values (NaN/inf)")
    
    # Check range for finite values
    valid_numeric = numeric_series[finite_mask]
    out_of_range_count = 0
    if len(valid_numeric) > 0:
        min_val, max_val = expected_range
        out_of_range = (valid_numeric < min_val) | (valid_numeric > max_val)
        out_of_range_count = out_of_range.sum()
        if out_of_range_count > 0:
            errors.append(f"{out_of_range_count} values outside valid range [{min_val}, {max_val}]")
        
        # Statistics for valid values
        min_value = float(valid_numeric.min())
        max_value = float(valid_numeric.max())
        mean_value = float(valid_numeric.mean())
        std_value = float(valid_numeric.std())
    else:
        min_value = None
        max_value = None
        mean_value = None
        std_value = None
        warnings.append("No finite numeric values found")
    
    # ADC-specific checks
    if 'raw' in column_name.lower() or 'reference' in column_name.lower():
        if min_value is not None:
            if min_val < 0:
                warnings.append("ADC values should not be negative")
            if max_val > 65535:
                warnings.append("ADC values exceed 12-bit maximum (65535)")
    
    # Reflectance-specific checks
    if 'reflectance' in column_name.lower():
        if min_val < 0 or max_val > 100:
            errors.append("Reflectance values must be in range [0, 100]")
    
    # NDVI-specific checks
    if 'ndvi' in column_name.lower():
        if min_val < -1 or max_val > 1:
            errors.append("NDVI values must be in range [-1, 1]")
    
    return NumericValidationResult(
        column=column_name,
        total_values=total_values,
        numeric_count=int(numeric_count),
        non_numeric_count=int(non_numeric_count),
        non_finite_count=int(non_finite_count),
        out_of_range_count=int(out_of_range_count),
        min_value=min_value,
        max_value=max_value,
        mean_value=mean_value,
        std_value=std_value,
        errors=errors,
        warnings=warnings,
    )


def validate_all_numeric(df: pd.DataFrame) -> Dict[str, NumericValidationResult]:
    """
    Validate all expected numeric columns in DataFrame.
    
    Args:
        df: DataFrame to validate
        
    Returns:
        Dict mapping column names to validation results
    """
    results = {}
    
    for col, (min_val, max_val, description) in NUMERIC_COLUMNS.items():
        if col in df.columns:
            results[col] = validate_numeric_column(df[col], col, (min_val, max_val))
        else:
            # Column missing
            results[col] = NumericValidationResult(
                column=col,
                total_values=len(df),
                numeric_count=0,
                non_numeric_count=0,
                non_finite_count=0,
                out_of_range_count=0,
                min_value=None,
                max_value=None,
                mean_value=None,
                std_value=None,
                errors=[f"Column '{col}' not present in DataFrame"],
                warnings=[f"Expected column '{col}' ({description}) is missing"],
            )
    
    return results


def validate_no_raw_as_reflectance(df: pd.DataFrame) -> List[str]:
    """
    CRITICAL VIKĀSA CHECK: Ensure raw ADC values are not being used as reflectance.
    
    This is a critical Vikāsa rule violation check.
    
    Returns:
        List of violation messages (empty if no violations)
    """
    violations = []
    
    # Check if raw ADC columns have values in reflectance range (0-100)
    raw_cols = ['red_raw', 'nir_raw', 'red_dark', 'nir_dark', 'red_reference', 'nir_reference']
    for col in raw_cols:
        if col in df.columns:
            numeric = pd.to_numeric(df[col], errors='coerce')
            finite = numeric[np.isfinite(numeric)]
            if len(finite) > 0:
                # Check if values look like reflectance (0-100) instead of ADC (0-65535)
                in_reflectance_range = ((finite >= 0) & (finite <= 100)).sum()
                if in_reflectance_range > len(finite) * 0.5:
                    violations.append(
                        f"Column '{col}' appears to contain reflectance values (0-100) "
                        f"instead of raw ADC counts (0-65535). "
                        f"{in_reflectance_range}/{len(finite)} values in reflectance range."
                    )
    
    # Check if reflectance columns have ADC-range values
    refl_cols = ['red_reflectance', 'nir_reflectance']
    for col in refl_cols:
        if col in df.columns:
            numeric = pd.to_numeric(df[col], errors='coerce')
            finite = numeric[np.isfinite(numeric)]
            if len(finite) > 0:
                in_adc_range = ((finite > 100) & (finite <= 65535)).sum()
                if in_adc_range > 0:
                    violations.append(
                        f"Column '{col}' appears to contain ADC values (>100) "
                        f"instead of reflectance percentages (0-100). "
                        f"{in_adc_range}/{len(finite)} values exceed 100."
                    )
    
    return violations


def check_ndvi_from_raw_adc(df: pd.DataFrame) -> List[str]:
    """
    CRITICAL VIKĀSA CHECK: Ensure NDVI is not calculated from raw ADC.
    
    NDVI MUST use calibrated reflectance only.
    
    Returns:
        List of violation messages
    """
    violations = []
    
    if 'ndvi' in df.columns:
        ndvi_vals = pd.to_numeric(df['ndvi'], errors='coerce')
        has_ndvi = ndvi_vals.notna().any()
        
        # Check if NDVI exists but calibrated reflectance is missing
        has_red_refl = 'red_reflectance' in df.columns and df['red_reflectance'].notna().any()
        has_nir_refl = 'nir_reflectance' in df.columns and df['nir_reflectance'].notna().any()
        
        if has_ndvi and not (has_red_refl and has_nir_refl):
            violations.append(
                "NDVI column has values but calibrated reflectance (red_reflectance, nir_reflectance) "
                "is missing or all null. NDVI must be computed from calibrated reflectance only."
            )
        
        # Check if NDVI values are inconsistent with available reflectance
        if has_red_refl and has_nir_refl:
            red = pd.to_numeric(df['red_reflectance'], errors='coerce')
            nir = pd.to_numeric(df['nir_reflectance'], errors='coerce')
            ndvi = pd.to_numeric(df['ndvi'], errors='coerce')
            
            mask = red.notna() & nir.notna() & ndvi.notna()
            if mask.any():
                expected = (nir[mask] - red[mask]) / (nir[mask] + red[mask])
                diff = (ndvi[mask] - expected).abs()
                inconsistent = (diff > 0.01).sum()
                if inconsistent > 0:
                    violations.append(
                        f"NDVI inconsistent with calibrated reflectance in {inconsistent} rows. "
                        f"Max diff: {diff.max():.4f}. NDVI must be computed from reflectance only."
                    )
    
    return violations