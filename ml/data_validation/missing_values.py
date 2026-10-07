"""
Vikāsa Missing Value Checking

Identifies and reports missing values in sensor data.
Does NOT fill or impute missing values. Only reports.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - actual missing value analysis requires real data.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import pandas as pd
import numpy as np


@dataclass
class MissingValueReport:
    """Report of missing values in a DataFrame."""
    total_rows: int
    total_cells: int
    missing_cells: int
    missing_percentage: float
    by_column: Dict[str, Dict[str, float]]
    completely_empty_columns: List[str]
    rows_with_any_missing: int
    rows_completely_empty: int


def check_missing_values(df: pd.DataFrame) -> MissingValueReport:
    """
    Generate comprehensive missing value report.
    
    DOES NOT FILL OR IMPUTE MISSING VALUES.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        MissingValueReport with detailed missing value statistics
    """
    total_rows = len(df)
    total_cells = df.size
    missing_cells = df.isnull().sum().sum()
    missing_percentage = (missing_cells / total_cells * 100) if total_cells > 0 else 0.0
    
    by_column = {}
    completely_empty_columns = []
    
    for col in df.columns:
        missing_count = df[col].isnull().sum()
        missing_pct = (missing_count / total_rows * 100) if total_rows > 0 else 0.0
        by_column[col] = {
            'missing_count': int(missing_count),
            'missing_percentage': round(missing_pct, 2),
            'dtype': str(df[col].dtype)
        }
        if missing_count == total_rows and total_rows > 0:
            completely_empty_columns.append(col)
    
    rows_with_any_missing = df.isnull().any(axis=1).sum()
    rows_completely_empty = df.isnull().all(axis=1).sum()
    
    return MissingValueReport(
        total_rows=total_rows,
        total_cells=total_cells,
        missing_cells=int(missing_cells),
        missing_percentage=round(missing_percentage, 2),
        by_column=by_column,
        completely_empty_columns=completely_empty_columns,
        rows_with_any_missing=int(rows_with_any_missing),
        rows_completely_empty=int(rows_completely_empty),
    )


def print_missing_report(report: MissingValueReport) -> None:
    """Print a formatted missing value report."""
    print(f"=== Missing Value Report ===")
    print(f"Total rows: {report.total_rows}")
    print(f"Total cells: {report.total_cells}")
    print(f"Missing cells: {report.missing_cells} ({report.missing_percentage:.2f}%)")
    print(f"Rows with any missing: {report.rows_with_any_missing}")
    print(f"Rows completely empty: {report.rows_completely_empty}")
    print(f"Completely empty columns: {report.completely_empty_columns}")
    print()
    print("By column:")
    for col, stats in report.by_column.items():
        if stats['missing_count'] > 0:
            print(f"  {col}: {stats['missing_count']} missing ({stats['missing_percentage']:.2f}%)")


def check_optical_missing(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check missing values specifically for optical measurement columns.
    
    Critical for Vikāsa: raw ADC vs calibrated reflectance separation.
    
    Returns:
        Dict with optical missing value analysis
    """
    optical_raw = ['red_raw', 'nir_raw', 'red_dark', 'nir_dark', 'red_reference', 'nir_reference']
    optical_calibrated = ['red_reflectance', 'nir_reflectance', 'ndvi']
    
    raw_missing = {}
    calibrated_missing = {}
    
    for col in optical_raw:
        if col in df.columns:
            raw_missing[col] = df[col].isnull().sum()
        else:
            raw_missing[col] = 'COLUMN_MISSING'
    
    for col in optical_calibrated:
        if col in df.columns:
            calibrated_missing[col] = df[col].isnull().sum()
        else:
            calibrated_missing[col] = 'COLUMN_MISSING'
    
    # Check if we have any rows with BOTH calibrated reflectances (needed for NDVI)
    both_reflectance = 0
    if 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns:
        both_reflectance = (df['red_reflectance'].notna() & df['nir_reflectance'].notna()).sum()
    
    ndvi_available = 0
    if 'ndvi' in df.columns:
        ndvi_available = df['ndvi'].notna().sum()
    
    return {
        'raw_adc_missing': raw_missing,
        'calibrated_missing': calibrated_missing,
        'rows_with_both_reflectances': int(both_reflectance),
        'ndvi_available': int(ndvi_available),
        'can_compute_ndvi': both_reflectance > 0,
    }


def check_environmental_missing(df: pd.DataFrame) -> Dict[str, int]:
    """
    Check missing values for environmental sensor columns.
    """
    env_cols = ['temperature_c', 'humidity_pct', 'soil_moisture_raw', 
                'soil_moisture_pct', 'ambient_light_raw']
    
    missing = {}
    for col in env_cols:
        if col in df.columns:
            missing[col] = df[col].isnull().sum()
        else:
            missing[col] = 'COLUMN_MISSING'
    return missing


def check_label_missing(df: pd.DataFrame) -> Dict[str, int]:
    """
    Check missing values for label columns.
    """
    label_cols = ['health_label', 'stress_type', 'label_evidence', 'species']
    missing = {}
    for col in label_cols:
        if col in df.columns:
            missing[col] = df[col].isnull().sum()
        else:
            missing[col] = 'COLUMN_MISSING'
    return missing