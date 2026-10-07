"""
Vikāsa Machine Learning Package

Complete ML pipeline for plant stress monitoring:
- Data validation (schema, missing values, numeric types)
- Preprocessing (filtering, scaling, splitting)
- Feature extraction (optical, environmental)
- Training (sklearn, XGBoost, LightGBM interfaces)
- Evaluation (metrics, calibration, per-plant analysis)
- Export (ONNX, TFLite, joblib, ESP32 deployment)

REQUIRES REAL VIKĀSA HARDWARE DATA: Most pipeline stages require actual Vikāsa hardware
measurements with verified labels and calibrated reflectance. The pipeline infrastructure
can be developed with reference data, but final model training and validation require
actual Vikāsa BPW34+LED hardware measurements with documented calibration.
"""

from .models import (
    # Training
    TrainingConfig, TrainingResult, BaseTrainer, SklearnTrainer,
    check_training_data_availability, train_with_checks, get_trainer,
    
    # Evaluation
    EvaluationResult, evaluate_sklearn_model, evaluate_with_ndvi_stratification,
    evaluate_by_plant, compute_calibration_curve, generate_evaluation_report,
    save_evaluation_report,
    
    # Export
    ExportConfig, ExportResult, BaseExporter, SklearnExporter,
    XGBoostExporter, TensorFlowLiteExporter, export_model, export_for_esp32,
    VIKASA_EXPORT_METADATA,
    
    # Features
    OpticalFeatures, extract_optical_features, calculate_reflectance,
    calculate_ndvi, extract_optical_features_batch, get_optical_feature_names,
    validate_optical_features,
    extract_environmental_features, extract_environmental_features_batch,
    get_environmental_feature_names, validate_environmental_features,
    get_all_feature_names,
    
    # Data Validation
    ValidationResult, validate_schema, validate_csv_file, validate_training_readiness,
    EXPECTED_COLUMNS, VALID_RANGES, REQUIRED_IDENTIFIERS,
    MissingValueReport, check_missing_values, print_missing_report,
    check_optical_missing, check_environmental_missing, check_label_missing,
    NumericValidationResult, validate_numeric_column, validate_all_numeric,
    validate_no_raw_as_reflectance, check_ndvi_from_raw_adc,
    
    # Preprocessing
    FilterResult, remove_duplicate_readings, filter_by_time_range,
    filter_by_plant, filter_by_session, remove_rows_without_calibrated_reflectance,
    filter_by_label_availability,
    BaseScaler, StandardScalerWrapper, MinMaxScalerWrapper, RobustScalerWrapper,
    create_scaler, load_scaler, VIKASA_SCALER_CONFIGS,
    SplitResult, split_temporal, split_stratified, split_by_plant,
    split_by_session, validate_split_no_leakage, get_split_recommendations,
    
    # Constants
    EXPECTED_COLUMNS, VALID_RANGES, REQUIRED_IDENTIFIERS,
    VIKASA_SCALER_CONFIGS, VIKASA_EXPORT_METADATA,
)

__version__ = "0.1.0"
__author__ = "Team Nexovate, Bangalore Institute of Technology"

# Check if verified training data is available at import time
def check_vikasa_data_ready() -> bool:
    """Check if verified Vikāsa training data is available."""
    from .training.trainer import check_training_data_availability
    return check_training_data_availability()['training_possible']


__all__ = [
    # Version info
    '__version__', '__author__', 'check_vikasa_data_ready',
    
    # Training
    'TrainingConfig', 'TrainingResult', 'BaseTrainer', 'SklearnTrainer',
    'check_training_data_availability', 'train_with_checks', 'get_trainer',
    
    # Evaluation
    'EvaluationResult', 'evaluate_sklearn_model', 'evaluate_with_ndvi_stratification',
    'evaluate_by_plant', 'compute_calibration_curve', 'generate_evaluation_report',
    'save_evaluation_report',
    
    # Export
    'ExportConfig', 'ExportResult', 'BaseExporter', 'SklearnExporter',
    'XGBoostExporter', 'TensorFlowLiteExporter', 'export_model', 'export_for_esp32',
    'VIKASA_EXPORT_METADATA',
    
    # Features
    'OpticalFeatures', 'extract_optical_features', 'calculate_reflectance',
    'calculate_ndvi', 'extract_optical_features_batch', 'get_optical_feature_names',
    'validate_optical_features',
    'extract_environmental_features', 'extract_environmental_features_batch',
    'get_environmental_feature_names', 'validate_environmental_features',
    'get_all_feature_names',
    
    # Data Validation
    'ValidationResult', 'validate_schema', 'validate_csv_file', 'validate_training_readiness',
    'EXPECTED_COLUMNS', 'VALID_RANGES', 'REQUIRED_IDENTIFIERS',
    'MissingValueReport', 'check_missing_values', 'print_missing_report',
    'check_optical_missing', 'check_environmental_missing', 'check_label_missing',
    'NumericValidationResult', 'validate_numeric_column', 'validate_all_numeric',
    'validate_no_raw_as_reflectance', 'check_ndvi_from_raw_adc',
    
    # Preprocessing
    'FilterResult', 'remove_duplicate_readings', 'filter_by_time_range',
    'filter_by_plant', 'filter_by_session', 'remove_rows_without_calibrated_reflectance',
    'filter_by_label_availability',
    'BaseScaler', 'StandardScalerWrapper', 'MinMaxScalerWrapper', 'RobustScalerWrapper',
    'create_scaler', 'load_scaler', 'VIKASA_SCALER_CONFIGS',
    'SplitResult', 'split_temporal', 'split_stratified', 'split_by_plant',
    'split_by_session', 'validate_split_no_leakage', 'get_split_recommendations',
    
    # Constants
    'EXPECTED_COLUMNS', 'VALID_RANGES', 'REQUIRED_IDENTIFIERS',
    'VIKASA_SCALER_CONFIGS', 'VIKASA_EXPORT_METADATA',
]