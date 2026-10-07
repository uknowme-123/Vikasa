"""
Vikāsa Environmental Feature Extraction

Handles environmental sensor features: temperature, humidity, soil moisture, ambient light.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - feature extraction requires actual sensor measurements.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import pandas as pd
import numpy as np


@dataclass
class EnvironmentalFeatures:
    """Container for extracted environmental features."""
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    soil_moisture_raw: Optional[float] = None
    soil_moisture_pct: Optional[float] = None
    ambient_light_raw: Optional[float] = None


def extract_environmental_features(row: pd.Series) -> dict:
    """
    Extract environmental features from a single row.
    
    Args:
        row: Single row from sensor DataFrame
        
    Returns:
        Dict with available environmental feature values
    """
    features = {}
    
    # Temperature
    temp = row.get('temperature_c')
    features['temperature_c'] = _safe_float(temp)
    
    # Humidity
    hum = row.get('humidity_pct')
    features['humidity_pct'] = _safe_float(hum)
    
    # Soil moisture (raw ADC and calibrated percentage)
    soil_raw = row.get('soil_moisture_raw')
    features['soil_moisture_raw'] = _safe_float(soil_raw)
    
    soil_pct = row.get('soil_moisture_pct')
    features['soil_moisture_pct'] = _safe_float(soil_pct)
    
    # Ambient light
    light = row.get('ambient_light_raw')
    features['ambient_light_raw'] = _safe_float(light)
    
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


def extract_environmental_features_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract environmental features for entire DataFrame.
    
    No computation - environmental features are direct sensor readings.
    Ensures columns exist and are numeric.
    
    Args:
        df: Sensor DataFrame
        
    Returns:
        DataFrame with validated environmental feature columns
    """
    df = df.copy()
    
    env_columns = [
        'temperature_c', 'humidity_pct', 
        'soil_moisture_raw', 'soil_moisture_pct',
        'ambient_light_raw'
    ]
    
    for col in env_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        else:
            df[col] = np.nan
    
    return df


def get_environmental_feature_names() -> List[str]:
    """Return list of environmental feature column names."""
    return [
        'temperature_c',
        'humidity_pct',
        'soil_moisture_raw',
        'soil_moisture_pct',
        'ambient_light_raw',
    ]


def validate_environmental_features(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate environmental feature availability and ranges.
    
    Returns:
        Dict with feature availability and validation results
    """
    env_cols = get_environmental_feature_names()
    available = [c for c in env_cols if c in df.columns]
    
    result = {
        'available_features': available,
        'missing_features': [c for c in env_cols if c not in available],
    }
    
    # Check each feature
    for col in env_cols:
        if col in df.columns:
            series = pd.to_numeric(df[col], errors='coerce')
            valid = series.notna()
            result[f'{col}_available'] = int(valid.sum())
            result[f'{col}_missing'] = int((~valid).sum())
            
            if valid.any():
                vals = series[valid]
                result[f'{col}_min'] = float(vals.min())
                result[f'{col}_max'] = float(vals.max())
                result[f'{col}_mean'] = float(vals.mean())
                
                # Range validation
                if col == 'temperature_c':
                    out_of_range = ((vals < -50) | (vals > 100)).sum()
                    if out_of_range > 0:
                        result[f'{col}_out_of_range'] = int(out_of_range)
                elif col == 'humidity_pct':
                    out_of_range = ((vals < 0) | (vals > 100)).sum()
                    if out_of_range > 0:
                        result[f'{col}_out_of_range'] = int(out_of_range)
                elif col == 'soil_moisture_pct':
                    out_of_range = ((vals < 0) | (vals > 100)).sum()
                    if out_of_range > 0:
                        result[f'{col}_out_of_range'] = int(out_of_range)
    
    return result


def get_environmental_feature_names() -> List[str]:
    """Return list of environmental feature column names."""
    return [
        'temperature_c',
        'humidity_pct',
        'soil_moisture_raw',
        'soil_moisture_pct',
        'ambient_light_raw',
    ]


def get_all_feature_names() -> List[str]:
    """Return all feature column names (optical + environmental)."""
    from .optical import get_optical_feature_names
    return get_optical_feature_names() + get_environmental_feature_names()