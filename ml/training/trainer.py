"""
Vikāsa Model Training Interface

Abstract interface for model training.
Does NOT implement specific model architectures.
Provides common training infrastructure.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - actual model training requires verified Vikāsa data.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import pandas as pd
import numpy as np


@dataclass
class TrainingConfig:
    """Configuration for model training."""
    model_type: str  # e.g., 'xgboost', 'lightgbm', 'sklearn_rf', 'nn'
    feature_columns: List[str]
    target_column: str
    hyperparameters: Dict[str, Any]
    validation_metric: str  # e.g., 'f1_macro', 'accuracy', 'roc_auc'
    early_stopping_rounds: Optional[int] = None
    random_state: int = 42


@dataclass
class TrainingResult:
    """Result of model training."""
    model: Any  # Trained model object
    config: TrainingConfig
    train_metrics: Dict[str, float]
    val_metrics: Dict[str, float]
    training_time_seconds: float
    model_path: Optional[str] = None
    feature_importance: Optional[Dict[str, float]] = None
    warnings: Optional[List[str]] = None


class BaseTrainer(ABC):
    """Abstract base class for model trainers."""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model = None
        self.training_history = []
    
    @abstractmethod
    def train(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> TrainingResult:
        """
        Train model on training data, validate on validation data.
        
        Args:
            train_df: Training data
            val_df: Validation data
            
        Returns:
            TrainingResult with model and metrics
        """
        pass
    
    @abstractmethod
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """
        Make predictions on new data.
        
        Args:
            df: DataFrame with features
            
        Returns:
            Predictions array
        """
        pass
    
    @abstractmethod
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """
        Get prediction probabilities (for classification).
        
        Args:
            df: DataFrame with features
            
        Returns:
            Probability array
        """
        pass
    
    def _validate_data(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> List[str]:
        """Validate training and validation data."""
        warnings = []
        
        # Check required columns
        required = self.config.feature_columns + [self.config.target_column]
        for df_name, df in [('train', train_df), ('val', val_df)]:
            missing = [c for c in required if c not in df.columns]
            if missing:
                raise ValueError(f"{df_name} data missing required columns: {missing}")
            
            # Check for null targets
            null_targets = df[self.config.target_column].isnull().sum()
            if null_targets > 0:
                raise ValueError(f"{df_name} data has {null_targets} null target values")
        
        return warnings
    
    def _prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare feature matrix and target vector."""
        X = df[self.config.feature_columns].copy()
        y = df[self.config.target_column].copy()
        
        # Convert to numeric
        for col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        
        # Handle missing features
        missing_features = X.isnull().sum().sum()
        if missing_features > 0:
            raise ValueError(f"Feature matrix has {missing_features} missing values")
        
        return X.values, y.values


def check_training_data_availability(data_dir: str = 'data/raw/hardware') -> Dict[str, Any]:
    """
    Check if verified Vikāsa training data is available.
    
    This is the gatekeeper function - if it returns False, training cannot proceed.
    
    Args:
        data_dir: Directory to check for training data
        
    Returns:
        Dict with availability status
    """
    from pathlib import Path
    import glob
    
    data_path = Path(data_dir)
    csv_files = list(data_path.rglob('*.csv'))
    
    # Exclude template files
    data_files = [f for f in csv_files if 'template' not in f.name.lower()]
    
    has_verified_data = len(data_files) > 0
    
    # If files exist, check if any have verified labels
    has_labels = False
    has_reflectance = False
    total_rows = 0
    
    if has_verified_data:
        import pandas as pd
        for f in data_files:
            try:
                df = pd.read_csv(f)
                total_rows += len(df)
                if 'health_label' in df.columns and df['health_label'].notna().any():
                    has_labels = True
                if 'red_reflectance' in df.columns and 'nir_reflectance' in df.columns:
                    if (df['red_reflectance'].notna() & df['nir_reflectance'].notna()).any():
                        has_reflectance = True
            except:
                pass
    
    return {
        'verified_data_available': has_verified_data,
        'has_verified_labels': has_labels,
        'has_calibrated_reflectance': has_reflectance,
        'data_files': [str(f) for f in data_files],
        'total_rows': total_rows,
        'training_possible': has_verified_data and has_labels and has_reflectance,
    }


def train_with_checks(train_df: pd.DataFrame, 
                      val_df: pd.DataFrame,
                      config: TrainingConfig,
                      trainer_class) -> TrainingResult:
    """
    Wrapper that checks data availability before training.
    
    If no verified data, raises clear error instead of training on invalid data.
    
    Args:
        train_df: Training data
        val_df: Validation data
        config: Training configuration
        trainer_class: Trainer class to instantiate
        
    Returns:
        TrainingResult
    """
    # Check if we have valid training data
    readiness = check_training_data_availability()
    
    if not readiness['training_possible']:
        error_msg = "No verified Vikāsa training dataset available."
        if not readiness['verified_data_available']:
            error_msg += " No data files found in data/raw/hardware/."
        if not readiness['has_verified_labels']:
            error_msg += " No verified labels (health_label with label_evidence) found."
        if not readiness['has_calibrated_reflectance']:
            error_msg += " No calibrated reflectance (red_reflectance + nir_reflectance) found."
        
        error_msg += " Collect actual Vikāsa hardware data with verified labels before training."
        
        raise RuntimeError(error_msg)
    
    # Proceed with training
    trainer = trainer_class(config)
    return trainer.train(train_df, val_df)


# Placeholder trainers for different model types
class SklearnTrainer(BaseTrainer):
    """Wrapper for scikit-learn compatible models."""
    
    def __init__(self, config: TrainingConfig):
        super().__init__(config)
        self._init_model()
    
    def _init_model(self):
        """Initialize model based on config."""
        model_type = self.config.model_type
        
        if model_type == 'sklearn_rf':
            from sklearn.ensemble import RandomForestClassifier
            self.model = RandomForestClassifier(**self.config.hyperparameters)
        elif model_type == 'sklearn_lr':
            from sklearn.linear_model import LogisticRegression
            self.model = LogisticRegression(**self.config.hyperparameters)
        elif model_type == 'sklearn_svm':
            from sklearn.svm import SVC
            self.model = SVC(probability=True, **self.config.hyperparameters)
        else:
            raise ValueError(f"Unknown sklearn model type: {self.config.model_type}")
    
    def train(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> TrainingResult:
        import time
        from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
        
        self._validate_data(train_df, val_df)
        
        X_train, y_train = self._prepare_features(train_df)
        X_val, y_val = self._prepare_features(val_df)
        
        start_time = time.time()
        self.model.fit(X_train, y_train)
        training_time = time.time() - start_time
        
        # Predictions
        y_pred_train = self.model.predict(X_train)
        y_pred_val = self.model.predict(X_val)
        
        # Metrics
        train_metrics = {'accuracy': float(accuracy_score(y_train, y_pred_train))}
        val_metrics = {'accuracy': float(accuracy_score(y_val, y_pred_val))}
        
        if hasattr(self.model, 'predict_proba'):
            try:
                y_proba_val = self.model.predict_proba(X_val)
                if y_proba_val.shape[1] == 2:
                    train_metrics['roc_auc'] = float(roc_auc_score(y_train, self.model.predict_proba(X_train)[:, 1]))
                    val_metrics['roc_auc'] = float(roc_auc_score(y_val, y_proba_val[:, 1]))
            except:
                pass
        
        # Feature importance
        feature_importance = None
        if hasattr(self.model, 'feature_importances_'):
            feature_importance = dict(zip(self.config.feature_columns, self.model.feature_importances_.tolist()))
        
        return TrainingResult(
            model=self.model,
            config=self.config,
            train_metrics=train_metrics,
            val_metrics=val_metrics,
            training_time_seconds=time.time() - start_time,
            feature_importance=feature_importance,
        )
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        X, _ = self._prepare_features(df)
        return self.model.predict(X)
    
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X, _ = self._prepare_features(df)
        return self.model.predict_proba(X)


# Placeholder for XGBoost trainer (to be implemented when data available)
class XGBoostTrainer(BaseTrainer):
    """XGBoost trainer (placeholder - requires xgboost package)."""
    
    def train(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> TrainingResult:
        raise NotImplementedError("XGBoost trainer not yet implemented. Requires xgboost package and verified data.")
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError
    
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError


# Placeholder for LightGBM trainer
class LightGBMTrainer(BaseTrainer):
    """LightGBM trainer (placeholder - requires lightgbm package)."""
    
    def train(self, train_df: pd.DataFrame, val_df: pd.DataFrame) -> TrainingResult:
        raise NotImplementedError("LightGBM trainer not yet implemented. Requires lightgbm package and verified data.")
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError
    
    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError


# Trainer factory
TRAINER_TYPES = {
    'sklearn_rf': SklearnTrainer,
    'sklearn_lr': SklearnTrainer,
    'sklearn_svm': SklearnTrainer,
    # 'xgboost': XGBoostTrainer,  # Enable when xgboost available
    # 'lightgbm': LightGBMTrainer,  # Enable when lightgbm available
}


def get_trainer(config: TrainingConfig) -> BaseTrainer:
    """Get trainer instance by model type."""
    if config.model_type not in TRAINER_TYPES:
        raise ValueError(f"Unknown trainer type: {config.model_type}. Available: {list(TRAINER_TYPES.keys())}")
    return TRAINER_TYPES[config.model_type](config)