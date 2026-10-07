"""
Vikāsa Feature Extraction

Core feature extraction logic for sensor data.
Separates raw ADC handling, calibrated reflectance handling, and NDVI calculation.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - feature extraction requires actual sensor measurements.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np


@dataclass
class OpticalFeatures:
    """Container for extracted optical features."""
    red_raw: Optional[float] = None
    nir_raw: Optional[float] = None
    red_dark: Optional[float] = None
    nir_dark: Optional[float] = None
    red_reference: Optional[float] = None
    nir_reference: Optional[float] = None
    red_reflectance: Optional[float] = None
    nir_reflectance: Optional[float] = None
    ndvi: Optional[float] = None
    red_dark_corrected: Optional[float] = None
    nir_dark_corrected: Optional[float] = None


def extract_optical_features(row: pd.Series) -> OpticalFeatures:
    """
    Extract optical features from a single row.
    
    DOES NOT CALCULATE REFLECTANCE OR NDVI FROM RAW ADC.
    Only extracts available values and computes dark-corrected values if references available.
    
    CRITICAL: Red/NIR reflectance and NDVI are only valid when calibrated values are present.
    Raw ADC counts are NEVER used directly for reflectance or NDVI calculation.
    
    Args:
        row: Single row from sensor DataFrame
        
    Returns:
        OpticalFeatures object with available values
    """
    features = OpticalFeatures()
    
    # Raw ADC values
    features.red_raw = _safe_float(row.get('red_raw'))
    features.nir_raw = _safe_float(row.get('nir_raw'))
    features.red_dark = _safe_float(row.get('red_dark'))
    features.nir_dark = _safe_float(row.get('nir_dark'))
    features.red_reference = _safe_float(row.get('red_reference'))
    features.nir_reference = _safe_float(row.get('nir_reference'))
    
    # Calibrated reflectance (only if explicitly provided)
    features.red_reflectance = _safe_float(row.get('red_reflectance'))
    features.nir_reflectance = _safe_float(row.get('nir_reflectance'))
    features.ndvi = _safe_float(row.get('ndvi'))
    
    # Dark-corrected values (only if both raw and dark available)
    if features.red_raw is not None and features.red_dark is not None:
        features.red_dark_corrected = features.red_raw - features.red_dark
    if features.nir_raw is not None and features.nir_dark is not None:
        features.nir_dark_corrected = features.nir_raw - features.nir_dark
    
    return features


def _safe_float(value) -> Optional[float]:
    """Safely convert value to float."""
    if value is None:
        return None
    if isinstance(value, float) and np.isnan(value):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def calculate_reflectance(illuminated: float, dark: float, reference: float) -> Optional[float]:
    """
    Calculate calibrated reflectance from raw measurements.
    
    Formula: (illuminated - dark) / (reference - dark) * 100
    
    REQUIRES: All three values (illuminated, dark, reference) must be available.
    This is the calibration step that REQUIRES Vikāsa hardware reference measurements.
    
    Args:
        illuminated: Raw ADC with LED on
        dark: Raw ADC with LED off (dark current)
        reference: Raw ADC with reference target
        
    Returns:
        Reflectance percentage (0-100) or None if inputs insufficient
    """
    if illuminated is None or dark is None or reference is None:
        return None
    
    denominator = reference - dark
    if denominator <= 0:
        return None  # Invalid reference/dark combination
    
    reflectance = (illuminated - dark) / denominator * 100.0
    
    # Clamp to valid range
    return max(0.0, min(100.0, reflectance))


def calculate_ndvi(red_reflectance: float, nir_reflectance: float) -> Optional[float]:
    """
    Calculate NDVI from calibrated reflectance values.
    
    Formula: (NIR - Red) / (NIR + Red)
    
    REQUIRES: Both reflectance values must be calibrated, not raw ADC.
    
    Args:
        red_reflectance: Calibrated red reflectance (%)
        nir_reflectance: Calibrated NIR reflectance (%)
        
    Returns:
        NDVI value (-1 to 1) or None if inputs invalid
    """
    if red_reflectance is None or nir_reflectance is None:
        return None
    
    total = nir_reflectance + red_reflectance
    if total == 0:
        return None
    
    ndvi = (nir_reflectance - red_reflectance) / total
    
    # Clamp to theoretical bounds
    return max(-1.0, min(1.0, ndvi))


def extract_optical_features_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract optical features for entire DataFrame.
    
    Adds computed columns where calibrated values are available.
    Does NOT create reflectance/NDVI from raw ADC.
    
    Args:
        df: Sensor DataFrame
        
    Returns:
        DataFrame with added optical feature columns
    """
    df = df.copy()
    
    # Dark-corrected values (where available)
    for band in ['red', 'nir']:
        raw_col = f'{band}_raw'
        dark_col = f'{band}_dark'
        ref_col = f'{band}_reference'
        corrected_col = f'{band}_dark_corrected'
        
        if all(c in df.columns for c in [raw_col, dark_col]):
            df[corrected_col] = pd.to_numeric(df[raw_col], errors='coerce') - \
                                pd.to_numeric(df[dark_col], errors='coerce')
    
    # Calculate reflectance where all three measurements available
    for band in ['red', 'nir']:
        ill_col = f'{band}_raw'
        dark_col = f'{band}_dark'
        ref_col = f'{band}_reference'
        refl_col = f'{band}_reflectance'
        
        if all(c in df.columns for c in [ill_col, dark_col, ref_col]):
            # Only calculate where reflectance is missing but raw data exists
            mask = df[refl_col].isna() & df[ill_col].notna() & df[dark_col].notna() & df[ref_col].notna()
            if mask.any():
                df.loc[mask, refl_col] = df.loc[mask].apply(
                    lambda row: calculate_reflectance(
                        _safe_float(row[ill_col]),
                        _safe_float(row[dark_col]),
                        _safe_float(row[ref_col])
                    ), axis=1
                )
    
    # Calculate NDVI where calibrated reflectance exists and NDVI missing
    if 'ndvi' in df.columns and 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns:
        mask = df['ndvi'].isna() & df['red_reflectance'].notna() & df['nir_reflectance'].notna()
        if mask.any():
            df.loc[mask, 'ndvi'] = df.loc[mask].apply(
                lambda row: calculate_ndvi(
                    _safe_float(row['red_reflectance']),
                    _safe_float(row['nir_reflectance'])
                ), axis=1
            )
    
    return df


def get_optical_feature_names() -> List[str]:
    """Return list of optical feature column names."""
    return [
        'red_raw', 'nir_raw',
        'red_dark', 'nir_dark',
        'red_reference', 'nir_reference',
        'red_dark_corrected', 'nir_dark_corrected',
        'red_reflectance', 'nir_reflectance',
        'ndvi',
    ]


def validate_optical_features(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate optical feature availability and consistency.
    
    Returns:
        Dict with feature availability and validation results
    """
    feature_names = get_optical_feature_names()
    available = [f for f in feature_names if f in df.columns]
    
    result = {
        'available_features': available,
        'missing_features': [f for f in feature_names if f not in available],
        'raw_adc_available': all(c in df.columns for c in ['red_raw', 'nir_raw']),
        'dark_corrected_available': all(c in df.columns for c in ['red_dark_corrected', 'nir_dark_corrected']),
        'calibrated_reflectance_available': all(c in df.columns for c in ['red_reflectance', 'nir_reflectance']),
        'ndvi_available': 'ndvi' in df.columns and df['ndvi'].notna().any(),
    }
    
    # Check calibrated reflectance availability
    if 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns:
        both_present = df['red_reflectance'].notna() & df['nir_reflectance'].notna()
        result['rows_with_both_reflectances'] = int(both_present.sum())
    else:
        result['rows_with_both_reflectances'] = 0
    
    # NDVI consistency check
    if result['ndvi_available'] and 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns:
        red = pd.to_numeric(df['red_reflectance'], errors='coerce')
        nir = pd.to_numeric(df['nir_reflectance'], errors='coerce')
        ndvi = pd.to_numeric(df['ndvi'], errors='coerce')
        
        mask = red.notna() & nir.notna() & ndvi.notna()
        if mask.any():
            expected = (nir[mask] - red[mask]) / (nir[mask] + red[mask])
            diff = (pd.to_numeric(df.loc[mask, 'ndvi'], errors='coerce') - expected).abs()
            result['ndvi_consistent'] = (diff <= 0.01).all()
            result['ndvi_max_diff'] = float(diff.max())
    
    return result