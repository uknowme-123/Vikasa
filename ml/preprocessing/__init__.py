"""
Vikāsa Preprocessing Module

Filtering, scaling, and data splitting operations.
"""

from .filtering import (
    FilterResult,
    remove_duplicate_readings,
    filter_by_time_range,
    filter_by_plant,
    filter_by_session,
    remove_rows_without_calibrated_reflectance,
    filter_by_label_availability,
)

from .scaling import (
    BaseScaler,
    StandardScalerWrapper,
    MinMaxScalerWrapper,
    RobustScalerWrapper,
    create_scaler,
    load_scaler,
    VIKASA_SCALER_CONFIGS,
)

from .splitting import (
    SplitResult,
    split_temporal,
    split_stratified,
    split_by_plant,
    split_by_session,
    validate_split_no_leakage,
    get_split_recommendations,
)

__all__ = [
    'FilterResult', 'remove_duplicate_readings', 'filter_by_time_range',
    'filter_by_plant', 'filter_by_session', 'remove_rows_without_calibrated_reflectance',
    'filter_by_label_availability',
    'BaseScaler', 'StandardScalerWrapper', 'MinMaxScalerWrapper', 'RobustScalerWrapper',
    'create_scaler', 'load_scaler', 'VIKASA_SCALER_CONFIGS',
    'SplitResult', 'split_temporal', 'split_stratified', 'split_by_plant',
    'split_by_session', 'validate_split_no_leakage', 'get_split_recommendations',
    'VIKASA_SCALER_CONFIGS',
]