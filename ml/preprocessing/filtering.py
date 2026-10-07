"""
Vikāsa Data Preprocessing - Filtering

Filtering operations for sensor data.
Does NOT fabricate or impute data.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - filtering parameters should be tuned to actual hardware characteristics.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np


@dataclass
class FilterResult:
    """Result of filtering operation."""
    original_rows: int
    filtered_rows: int
    removed_rows: int
    removal_reasons: Dict[str, int]
    warnings: List[str]


def remove_duplicate_readings(df: pd.DataFrame, id_column: str = 'reading_id') -> FilterResult:
    """
    Remove duplicate readings based on unique identifier.
    
    Args:
        df: DataFrame to deduplicate
        id_column: Column containing unique reading IDs
        
    Returns:
        FilterResult with deduplicated DataFrame info
    """
    original_rows = len(df)
    
    if id_column not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=original_rows,
            removed_rows=0,
            removal_reasons={'id_column_missing': 1},
            warnings=[f"ID column '{id_column}' not found, no deduplication performed"]
        )
    
    duplicates = df.duplicated(subset=[id_column], keep='first')
    removed = duplicates.sum()
    filtered = df[~duplicates].copy()
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=int(removed),
        removal_reasons={'duplicate_reading_id': int(removed)},
        warnings=[f"Removed {removed} duplicate reading(s) by '{id_column}'"] if removed > 0 else []
    )


def filter_by_time_range(df: pd.DataFrame, timestamp_column: str = 'timestamp',
                         start_time: Optional[pd.Timestamp] = None,
                         end_time: Optional[pd.Timestamp] = None) -> FilterResult:
    """
    Filter readings by time range.
    
    Args:
        df: DataFrame to filter
        timestamp_column: Column with timestamps
        start_time: Inclusive start time (UTC)
        end_time: Inclusive end time (UTC)
        
    Returns:
        FilterResult with time-filtered DataFrame info
    """
    original_rows = len(df)
    
    if timestamp_column not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=original_rows,
            removed_rows=0,
            removal_reasons={'timestamp_column_missing': 1},
            warnings=[f"Timestamp column '{timestamp_column}' not found"]
        )
    
    # Ensure datetime
    df = df.copy()
    df[timestamp_column] = pd.to_datetime(df[timestamp_column], utc=True, errors='coerce')
    
    mask = pd.Series(True, index=df.index)
    reasons = {}
    
    if start_time is not None:
        before = df[timestamp_column] < start_time
        reasons['before_start_time'] = int(before.sum())
        mask = mask & ~before
    
    if end_time is not None:
        after = df[timestamp_column] > end_time
        reasons['after_end_time'] = int(after.sum())
        mask = mask & ~after
    
    # Handle unparseable timestamps
    nat_count = df[timestamp_column].isna().sum()
    if nat_count > 0:
        reasons['unparseable_timestamp'] = int(nat_count)
        mask = mask & df[timestamp_column].notna()
    
    filtered = df[mask].copy()
    removed = sum(reasons.values())
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=removed,
        removal_reasons=reasons,
        warnings=[f"Removed {r} rows: {reason}" for reason, r in reasons.items()] if removed > 0 else []
    )


def filter_by_plant(df: pd.DataFrame, plant_ids: List[str],
                    plant_column: str = 'plant_id') -> FilterResult:
    """
    Filter readings to specific plant IDs.
    
    Args:
        df: DataFrame to filter
        plant_ids: List of plant IDs to keep
        plant_column: Column containing plant IDs
        
    Returns:
        FilterResult with plant-filtered DataFrame info
    """
    original_rows = len(df)
    
    if plant_column not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=original_rows,
            removed_rows=0,
            removal_reasons={'plant_column_missing': 1},
            warnings=[f"Plant column '{plant_column}' not found"]
        )
    
    mask = df[plant_column].isin(plant_ids)
    removed = (~mask).sum()
    filtered = df[mask].copy()
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=int(removed),
        removal_reasons={'plant_not_in_list': int(removed)},
        warnings=[f"Removed {removed} rows not in plant list"] if removed > 0 else []
    )


def filter_by_session(df: pd.DataFrame, session_ids: List[str],
                      session_column: str = 'session_id') -> FilterResult:
    """
    Filter readings to specific session IDs.
    """
    original_rows = len(df)
    
    if session_column not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=original_rows,
            removed_rows=0,
            removal_reasons={'session_column_missing': 1},
            warnings=[f"Session column '{session_column}' not found"]
        )
    
    mask = df[session_column].isin(session_ids)
    removed = (~mask).sum()
    filtered = df[mask].copy()
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=int(removed),
        removal_reasons={'session_not_in_list': int(removed)},
        warnings=[f"Removed {removed} rows not in session list"] if removed > 0 else []
    )


def remove_rows_without_calibrated_reflectance(df: pd.DataFrame) -> FilterResult:
    """
    Remove rows that don't have both calibrated reflectances (needed for NDVI).
    
    CRITICAL: Only keeps rows with both red_reflectance AND nir_reflectance.
    This is required for valid NDVI calculation.
    
    DOES NOT FILL MISSING REFLECTANCE VALUES.
    """
    original_rows = len(df)
    
    if 'red_reflectance' not in df.columns or 'nir_reflectance' not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=0,
            removed_rows=original_rows,
            removal_reasons={'missing_reflectance_columns': original_rows},
            warnings=["Calibrated reflectance columns missing, all rows removed"]
        )
    
    mask = df['red_reflectance'].notna() & df['nir_reflectance'].notna()
    removed = (~mask).sum()
    filtered = df[mask].copy()
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=int(removed),
        removal_reasons={'missing_calibrated_reflectance': int(removed)},
        warnings=[f"Removed {removed} rows missing calibrated reflectance"] if removed > 0 else []
    )


def filter_by_label_availability(df: pd.DataFrame, 
                                 label_column: str = 'health_label',
                                 label_evidence_column: str = 'label_evidence',
                                 require_evidence: bool = True) -> FilterResult:
    """
    Filter rows based on label availability.
    
    Args:
        df: DataFrame to filter
        label_column: Column with health/stress labels
        label_evidence_column: Column with label evidence
        require_evidence: If True, require label_evidence to be non-null
    """
    original_rows = len(df)
    
    if label_column not in df.columns:
        return FilterResult(
            original_rows=original_rows,
            filtered_rows=0,
            removed_rows=original_rows,
            removal_reasons={'label_column_missing': original_rows},
            warnings=[f"Label column '{label_column}' not found"]
        )
    
    mask = df[label_column].notna()
    if require_evidence and label_evidence_column in df.columns:
        mask = mask & df[label_evidence_column].notna()
    
    removed = (~mask).sum()
    filtered = df[mask].copy()
    
    reasons = {'missing_label': int((~df[label_column].notna()).sum())}
    if require_evidence and label_evidence_column in df.columns:
        reasons['missing_evidence'] = int((~df[label_evidence_column].notna() & df[label_column].notna()).sum())
    
    return FilterResult(
        original_rows=original_rows,
        filtered_rows=len(filtered),
        removed_rows=int(removed),
        removal_reasons=reasons,
        warnings=[f"Removed {removed} rows missing labels/evidence"] if removed > 0 else []
    )