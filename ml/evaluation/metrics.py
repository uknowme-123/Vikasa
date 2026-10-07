"""
Vikāsa Model Evaluation Interface

Standardized evaluation metrics and reporting for plant stress classification.
Does NOT train models - only evaluates.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - evaluation requires validated test data with verified labels.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, roc_curve
)
import json


@dataclass
class EvaluationResult:
    """Result of model evaluation."""
    metrics: Dict[str, float]
    per_class_metrics: Dict[str, Dict[str, float]]
    confusion_matrix: np.ndarray
    classification_report_str: str
    warnings: List[str]


def evaluate_classifier(model: Any,
                        test_df: pd.DataFrame,
                        feature_columns: List[str],
                        target_column: str = 'health_label') -> EvaluationResult:
    """
    Evaluate a trained classifier on test data.
    
    REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - evaluation requires verified test data.
    
    Args:
        model: Trained model with predict/predict_proba methods
        test_df: Test DataFrame with features and labels
        feature_columns: List of feature column names
        target_column: Target column name
        
    Returns:
        EvaluationResult with all metrics
    """
    warnings = []
    
    # Validate test data
    required_columns = feature_columns + [target_column]
    missing = [c for c in required_columns if c not in test_df.columns]
    if missing:
        raise ValueError(f"Test data missing required columns: {missing}")
    
    # Check for labels
    if test_df[target_column].isnull().any():
        warnings.append(f"Test data has {test_df[target_column].isnull().sum()} null target values - they will be excluded")
    
    # Prepare features and targets
    X_test = test_df[feature_columns].copy()
    y_test = test_df[target_column].copy()
    
    # Convert features to numeric
    for col in feature_columns:
        test_df[col] = pd.to_numeric(test_df[col], errors='coerce')
    
    # Remove rows with missing features or targets
    valid_mask = X_test.notna().all(axis=1) & test_df[target_column].notna()
    if not valid_mask.all():
        excluded = (~valid_mask).sum()
        X_test = X_test[valid_mask]
        y_test = y_test[valid_mask]
        if not warnings:
            warnings.append(f"Excluded {len(test_df) - valid_mask.sum()} rows with missing features or targets")
    
    if len(y_test) == 0:
        raise ValueError("No valid test samples after removing missing values")
    
    # Get predictions
    X_test_vals = test_df[feature_columns].values
    y_pred = test_df[target_column].map(lambda x: x).values  # Will be replaced
    
    # Make predictions
    y_pred = test_df[feature_columns].apply(lambda _: None, axis=1).values  # Placeholder
    
    # Actually get predictions from model
    X_test_vals = test_df[feature_columns].values
    y_pred = test_df[target_column].map(lambda x: x).values  # placeholder
    
    # Actually get model predictions
    y_pred = test_df[feature_columns].apply(lambda _: None).values  # WRONG
    
    # CORRECT:
    # Get feature matrix
    X_test = test_df[feature_columns].values
    # Get predictions from model
    y_pred = None
    y_proba = None
    
    # We need to call the model
    # Since we can't know the exact model interface, we'll check for common methods
    
    raise NotImplementedError("evaluate_classifier requires model object with predict method")
    
    # This function is a template - actual implementation depends on model interface
    # Use evaluate_sklearn_model, evaluate_xgboost_model, etc. instead


def evaluate_sklearn_model(model: Any,
                           test_df: pd.DataFrame,
                           feature_columns: List[str],
                           target_column: str = 'health_label',
                           class_names: Optional[List[str]] = None) -> EvaluationResult:
    """
    Evaluate a scikit-learn compatible model.
    
    Args:
        model: Trained sklearn-compatible model with predict/predict_proba
        test_df: Test DataFrame
        feature_columns: Feature column names
        target_column: Target column name
        class_names: Optional list of class names for reporting
        
    Returns:
        EvaluationResult
    """
    warnings = []
    
    # Validate
    required = feature_columns + [target_column]
    missing = [c for c in feature_columns + [target_column] if c not in test_df.columns]
    if missing:
        raise ValueError(f"Test data missing columns: {missing}")
    
    # Prepare data
    X = test_df[feature_columns].copy()
    y = test_df[target_column].copy()
    
    # Convert to numeric
    for col in feature_columns:
        test_df[col] = pd.to_numeric(test_df[col], errors='coerce')
    
    # Handle missing
    valid = X.notna().all(axis=1) & test_df[target_column].notna()
    if not valid.all():
        warnings.append(f"Excluded {(~valid).sum()} rows with missing features/labels")
        X = X[valid]
        y = test_df.loc[valid, target_column]
    
    if len(y) == 0:
        raise ValueError("No valid test samples")
    
    # Get predictions
    X_vals = X.values
    y_true = y.values
    y_pred = model.predict(X.values)
    
    # Get probabilities if available
    y_proba = None
    if hasattr(model, 'predict_proba'):
        try:
            y_proba = model.predict_proba(X.values)
        except:
            warnings.append("predict_proba failed - some metrics unavailable")
    
    # Compute metrics
    metrics = {}
    
    # Overall metrics
    metrics['accuracy'] = float(accuracy_score(y_true, y_pred))
    metrics['f1_macro'] = float(f1_score(y_true, y_pred, average='macro', zero_division=0))
    metrics['f1_weighted'] = float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
    metrics['precision_macro'] = float(precision_score(y_true, y_pred, average='macro', zero_division=0))
    metrics['recall_macro'] = float(recall_score(y_true, y_pred, average='macro', zero_division=0))
    
    # ROC AUC if binary or multiclass with probabilities
    if y_proba is not None:
        try:
            if len(np.unique(y_true)) == 2:
                metrics['roc_auc'] = float(roc_auc_score(y_true, y_proba[:, 1]))
            else:
                metrics['roc_auc_ovr'] = float(roc_auc_score(y_true, y_proba, multi_class='ovr'))
        except Exception as e:
            warnings.append(f"ROC AUC calculation failed: {e}")
    
    # Per-class metrics
    classes = np.unique(y_true)
    per_class = {}
    for cls in classes:
        mask = y_true == cls
        if mask.sum() > 0:
            per_class[str(cls)] = {
                'precision': float(precision_score(y_true, y_pred, labels=[cls], average='macro', zero_division=0)),
                'recall': float(recall_score(y_true, y_pred, labels=[cls], average='macro', zero_division=0)),
                'f1': float(f1_score(y_true, y_pred, labels=[cls], average='macro', zero_division=0)),
                'support': int(mask.sum()),
            }
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    
    # Classification report string
    if class_names is None:
        class_names = [str(c) for c in classes]
    report_str = classification_report(y_true, y_pred, target_names=class_names, zero_division=0)
    
    return EvaluationResult(
        metrics=metrics,
        per_class_metrics=per_class,
        confusion_matrix=cm,
        classification_report_str=report_str,
        warnings=warnings,
    )


def evaluate_with_ndvi_stratification(model: Any,
                                      test_df: pd.DataFrame,
                                      feature_columns: List[str],
                                      target_column: str = 'health_label') -> Dict[str, EvaluationResult]:
    """
    Evaluate model separately on samples with and without NDVI.
    
    Useful for understanding model reliance on optical features.
    
    Returns:
        Dict with 'has_ndvi' and 'no_ndvi' evaluation results
    """
    # Split test data
    has_ndvi_mask = test_df['ndvi'].notna() if 'ndvi' in test_df.columns else pd.Series(False, index=test_df.index)
    no_ndvi_mask = ~has_ndvi_mask
    
    results = {}
    
    if has_ndvi_mask.any():
        results['has_ndvi'] = evaluate_sklearn_model(
            model, test_df[has_ndvi_mask], feature_columns, target_column
        )
    
    if no_ndvi_mask.any():
        results['no_ndvi'] = evaluate_sklearn_model(
            model, test_df[no_ndvi_mask], feature_columns, target_column
        )
    
    return results


def evaluate_by_plant(model: Any,
                      test_df: pd.DataFrame,
                      feature_columns: List[str],
                      target_column: str = 'health_label',
                      plant_column: str = 'plant_id') -> Dict[str, EvaluationResult]:
    """
    Evaluate model separately per plant.
    
    Identifies plants where model performs poorly.
    """
    results = {}
    
    for plant_id in test_df[plant_column].unique():
        plant_df = test_df[test_df[plant_column] == plant_id]
        if len(plant_df) < 2:
            continue
        
        try:
            results[str(plant_id)] = evaluate_sklearn_model(
                model, plant_df, feature_columns, target_column
            )
        except Exception as e:
            # Skip plants with insufficient data
            pass
    
    return results


def compute_calibration_curve(y_true: np.ndarray, 
                              y_proba: np.ndarray, 
                              n_bins: int = 10) -> Dict[str, np.ndarray]:
    """
    Compute calibration curve for probability predictions.
    
    Returns:
        Dict with bin edges, fraction of positives, mean predicted probability
    """
    from sklearn.calibration import calibration_curve
    
    if len(y_proba.shape) > 1 and y_proba.shape[1] == 2:
        prob_pos = y_proba[:, 1]
    else:
        prob_pos = y_proba
    
    fraction_pos, mean_pred = calibration_curve(y_true, prob_pos, n_bins=n_bins)
    
    return {
        'fraction_positives': fraction_pos,
        'mean_predicted': mean_pred,
        'bin_edges': np.linspace(0, 1, n_bins + 1),
    }


def generate_evaluation_report(result: EvaluationResult, 
                               model_name: str = "Model",
                               dataset_name: str = "Test") -> str:
    """
    Generate human-readable evaluation report.
    
    Returns:
        Formatted string report
    """
    lines = [
        f"=== {model_name} Evaluation Report ===",
        f"Dataset: {dataset_name}",
        "",
        "Overall Metrics:",
    ]
    
    for metric, value in result.metrics.items():
        lines.append(f"  {metric}: {value:.4f}")
    
    lines.append("")
    lines.append("Per-Class Metrics:")
    for cls, metrics in result.per_class_metrics.items():
        lines.append(f"  Class {cls}:")
        for metric, value in metrics.items():
            lines.append(f"    {metric}: {value:.4f}")
    
    lines.append("")
    lines.append("Confusion Matrix:")
    lines.append(str(result.confusion_matrix))
    
    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for w in result.warnings:
            lines.append(f"  ⚠️ {w}")
    
    return "\n".join(lines)


def save_evaluation_report(result: EvaluationResult, 
                           filepath: str,
                           model_name: str = "Model",
                           dataset_name: str = "Test") -> None:
    """Save evaluation report as JSON."""
    report = {
        'model_name': model_name,
        'dataset_name': dataset_name,
        'metrics': result.metrics,
        'per_class_metrics': result.per_class_metrics,
        'confusion_matrix': result.confusion_matrix.tolist(),
        'warnings': result.warnings,
    }
    with open(filepath, 'w') as f:
        json.dump(report, f, indent=2)