"""
Vikāsa Evaluation Module

Model evaluation metrics and reporting.
"""

from .metrics import (
    EvaluationResult,
    evaluate_sklearn_model,
    evaluate_with_ndvi_stratification,
    evaluate_by_plant,
    compute_calibration_curve,
    generate_evaluation_report,
    save_evaluation_report,
)

__all__ = [
    'EvaluationResult', 'evaluate_sklearn_model', 'evaluate_with_ndvi_stratification',
    'evaluate_by_plant', 'compute_calibration_curve', 'generate_evaluation_report',
    'save_evaluation_report',
]