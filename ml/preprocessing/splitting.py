"""
Vikāsa Data Splitting

Train/validation/test splitting with stratified and temporal options.
Ensures no data leakage and proper handling of temporal data.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - splitting strategy should be validated on actual data distributions.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split


@dataclass
class SplitResult:
    """Result of data splitting."""
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame
    split_info: Dict[str, Any]


def split_temporal(df: pd.DataFrame, 
                   timestamp_column: str = 'timestamp',
                   train_ratio: float = 0.7,
                   val_ratio: float = 0.15,
                   test_ratio: float = 0.15) -> SplitResult:
    """
    Split data temporally (by timestamp).
    
    Ensures no future data leaks into training.
    
    Args:
        df: DataFrame to split
        timestamp_column: Column with timestamps
        train_ratio: Fraction for training
        val_ratio: Fraction for validation
        test_ratio: Fraction for test
        
    Returns:
        SplitResult with train/val/test splits
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, "Ratios must sum to 1.0"
    
    df = df.copy()
    df[timestamp_column] = pd.to_datetime(df[timestamp_column], utc=True, errors='coerce')
    
    # Sort by time
    df = df.sort_values(timestamp_column).reset_index(drop=True)
    
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = train_end + int(n * val_ratio)
    
    train = df.iloc[:train_end].copy()
    val = df.iloc[train_end:val_end].copy()
    test = df.iloc[val_end:].copy()
    
    split_info = {
        'method': 'temporal',
        'train_ratio': train_ratio,
        'val_ratio': val_ratio,
        'test_ratio': test_ratio,
        'train_size': len(train),
        'val_size': len(val),
        'test_size': len(test),
        'train_time_range': (train[timestamp_column].min(), train[timestamp_column].max()) if len(train) > 0 else None,
        'val_time_range': (val[timestamp_column].min(), val[timestamp_column].max()) if len(val) > 0 else None,
        'test_time_range': (test[timestamp_column].min(), test[timestamp_column].max()) if len(test) > 0 else None,
    }
    
    return SplitResult(train=train, val=val, test=test, split_info=split_info)


def split_stratified(df: pd.DataFrame,
                     stratify_column: str,
                     train_ratio: float = 0.7,
                     val_ratio: float = 0.15,
                     test_ratio: float = 0.15,
                     random_state: int = 42) -> SplitResult:
    """
    Split data with stratification on a categorical column.
    
    Useful for ensuring label distribution across splits.
    
    Args:
        df: DataFrame to split
        stratify_column: Column to stratify on
        train_ratio: Fraction for training
        val_ratio: Fraction for validation
        test_ratio: Fraction for test
        random_state: Random seed
        
    Returns:
        SplitResult with stratified train/val/test splits
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, "Ratios must sum to 1.0"
    
    if stratify_column not in df.columns:
        raise ValueError(f"Stratify column '{stratify_column}' not found in DataFrame")
    
    # First split: train vs (val + test)
    train_ratio_adj = train_ratio
    val_test_ratio = val_ratio + test_ratio
    
    train, val_test = train_test_split(
        df, 
        test_size=val_test_ratio,
        stratify=df[stratify_column],
        random_state=random_state
    )
    
    # Second split: val vs test
    val_ratio_adj = val_ratio / val_test_ratio
    val, test = train_test_split(
        val_test,
        test_size=1 - val_ratio_adj,
        stratify=val_test[stratify_column],
        random_state=random_state
    )
    
    split_info = {
        'method': 'stratified',
        'stratify_column': stratify_column,
        'train_ratio': train_ratio,
        'val_ratio': val_ratio,
        'test_ratio': test_ratio,
        'train_size': len(train),
        'val_size': len(val),
        'test_size': len(test),
        'random_state': random_state,
    }
    
    return SplitResult(
        train=train.reset_index(drop=True),
        val=val.reset_index(drop=True),
        test=test.reset_index(drop=True),
        split_info=split_info
    )


def split_by_plant(df: pd.DataFrame,
                   plant_column: str = 'plant_id',
                   train_ratio: float = 0.7,
                   val_ratio: float = 0.15,
                   test_ratio: float = 0.15,
                   random_state: int = 42) -> SplitResult:
    """
    Split by plant ID (group-wise split).
    
    Ensures no plant appears in more than one split (prevents data leakage).
    
    Args:
        df: DataFrame to split
        plant_column: Column with plant IDs
        train_ratio: Fraction for training
        val_ratio: Fraction for validation
        test_ratio: Fraction for test
        random_state: Random seed
        
    Returns:
        SplitResult with plant-wise splits
    """
    if plant_column not in df.columns:
        raise ValueError(f"Plant column '{plant_column}' not found")
    
    unique_plants = df[plant_column].unique()
    n_plants = len(unique_plants)
    
    # Split plants into train/val/test
    n_train = int(n_plants * train_ratio)
    n_val = int(n_plants * val_ratio)
    n_test = n_plants - n_train - n_val
    
    np.random.seed(random_state)
    shuffled = np.random.permutation(unique_plants)
    
    train_plants = set(shuffled[:n_train])
    val_plants = set(shuffled[n_train:n_train + n_val])
    test_plants = set(shuffled[n_train + n_val:])
    
    train = df[df[plant_column].isin(train_plants)].copy()
    val = df[df[plant_column].isin(val_plants)].copy()
    test = df[df[plant_column].isin(test_plants)].copy()
    
    split_info = {
        'method': 'by_plant',
        'plant_column': plant_column,
        'train_plants': list(train_plants),
        'val_plants': list(val_plants),
        'test_plants': list(test_plants),
        'train_size': len(train),
        'val_size': len(val),
        'test_size': len(test),
        'random_state': random_state,
    }
    
    return SplitResult(
        train=train.reset_index(drop=True),
        val=val.reset_index(drop=True),
        test=test.reset_index(drop=True),
        split_info=split_info
    )


def split_by_session(df: pd.DataFrame,
                     session_column: str = 'session_id',
                     train_ratio: float = 0.7,
                     val_ratio: float = 0.15,
                     test_ratio: float = 0.15,
                     random_state: int = 42) -> SplitResult:
    """
    Split by session ID (group-wise split).
    
    Similar to plant-wise but by session.
    """
    if session_column not in df.columns:
        raise ValueError(f"Session column '{session_column}' not found")
    
    unique_sessions = df[session_column].unique()
    n_sessions = len(unique_sessions)
    
    np.random.seed(random_state)
    shuffled = np.random.permutation(unique_sessions)
    
    n_train = int(n_sessions * train_ratio)
    n_val = int(n_sessions * val_ratio)
    n_test = n_sessions - n_train - n_val
    
    train_sessions = set(shuffled[:n_train])
    val_sessions = set(shuffled[n_train:n_train + n_val])
    test_sessions = set(shuffled[n_train + n_val:])
    
    train = df[df[session_column].isin(train_sessions)].copy()
    val = df[df[session_column].isin(val_sessions)].copy()
    test = df[df[session_column].isin(test_sessions)].copy()
    
    split_info = {
        'method': 'by_session',
        'session_column': session_column,
        'train_sessions': list(train_sessions),
        'val_sessions': list(val_sessions),
        'test_sessions': list(test_sessions),
        'train_size': len(train),
        'val_size': len(val),
        'test_size': len(test),
        'random_state': random_state,
    }
    
    return SplitResult(
        train=train.reset_index(drop=True),
        val=val.reset_index(drop=True),
        test=test.reset_index(drop=True),
        split_info=split_info
    )


def validate_split_no_leakage(train: pd.DataFrame, 
                              val: pd.DataFrame, 
                              test: pd.DataFrame,
                              id_column: str = 'reading_id') -> Dict[str, Any]:
    """
    Validate that splits have no overlapping IDs (no data leakage).
    
    Args:
        train: Training DataFrame
        val: Validation DataFrame
        test: Test DataFrame
        id_column: Unique identifier column
        
    Returns:
        Dict with leakage check results
    """
    train_ids = set(train[id_column]) if id_column in train.columns else set()
    val_ids = set(val[id_column]) if id_column in val.columns else set()
    test_ids = set(test[id_column]) if id_column in test.columns else set()
    
    train_val_overlap = train_ids & val_ids
    train_test_overlap = train_ids & test_ids
    val_test_overlap = val_ids & test_ids
    
    return {
        'train_val_overlap': len(train_val_overlap),
        'train_test_overlap': len(train_test_overlap),
        'val_test_overlap': len(val_test_overlap),
        'has_leakage': len(train_val_overlap) > 0 or len(train_test_overlap) > 0 or len(val_test_overlap) > 0,
        'train_ids': len(train_ids),
        'val_ids': len(val_ids),
        'test_ids': len(test_ids),
    }


def get_split_recommendations(df: pd.DataFrame) -> Dict[str, str]:
    """
    Get recommended splitting strategy based on data characteristics.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        Dict with recommended strategies
    """
    recommendations = {}
    
    # Check for temporal column
    if 'timestamp' in df.columns:
        try:
            pd.to_datetime(df['timestamp'], utc=True)
            recommendations['primary'] = 'temporal'
            recommendations['reason'] = 'Timestamp column available - temporal split prevents future data leakage'
        except:
            pass
    
    # Check for plant_id
    if 'plant_id' in df.columns:
        n_plants = df['plant_id'].nunique()
        if n_plants >= 3:
            recommendations['by_plant'] = 'recommended'
            recommendations['plant_reason'] = f'{n_plants} unique plants - can use plant-wise split to prevent leakage'
    
    # Check for session_id
    if 'session_id' in df.columns:
        n_sessions = df['session_id'].nunique()
        if n_sessions >= 3:
            recommendations['by_session'] = 'recommended'
            recommendations['session_reason'] = f'{n_sessions} unique sessions - can use session-wise split'
    
    # Check for labels
    if 'health_label' in df.columns and df['health_label'].notna().any():
        recommendations['stratified'] = 'available'
        recommendations['stratify_reason'] = 'health_label available for stratified splitting'
    
    return recommendations