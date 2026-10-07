"""
Vikāsa Data Validation Module

Schema validation, missing value checking, and numeric type validation.
"""

from .schema import (
    ValidationResult,
    validate_schema,
    validate_csv_file,
    validate_training_readiness,
    EXPECTED_COLUMNS,
    VALID_RANGES,
    REQUIRED_IDENTIFIERS,
)

from .missing_values import (
    MissingValueReport,
    check_missing_values,
    print_missing_report,
    check_optical_missing,
    check_environmental_missing,
    check_label_missing,
)

from .numeric import (
    NumericValidationResult,
    validate_numeric_column,
    validate_all_numeric,
    validate_no_raw_as_reflectance,
    check_ndvi_from_raw_adc,
    NUMERIC_COLUMNS,
)

__all__ = [
    'ValidationResult', 'validate_schema', 'validate_csv_file', 'validate_training_readiness',
    'EXPECTED_COLUMNS', 'VALID_RANGES', 'REQUIRED_IDENTIFIERS',
    'MissingValueReport', 'check_missing_values', 'print_missing_report',
    'check_optical_missing', 'check_environmental_missing', 'check_label_missing',
    'NumericValidationResult', 'validate_numeric_column', 'validate_all_numeric',
    'validate_no_raw_as_reflectance', 'check_ndvi_from_raw_adc', 'NUMERIC_COLUMNS',
]