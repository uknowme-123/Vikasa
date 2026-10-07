"""
Vikāsa Training Module

Model training interfaces and infrastructure.
"""

from .trainer import (
    TrainingConfig,
    TrainingResult,
    BaseTrainer,
    SklearnTrainer,
    XGBoostTrainer,
    LightGBMTrainer,
    check_training_data_availability,
    train_with_checks,
    TRAINER_TYPES,
    get_trainer,
)

__all__ = [
    'TrainingConfig', 'TrainingResult', 'BaseTrainer', 'SklearnTrainer',
    'XGBoostTrainer', 'LightGBMTrainer',
    'check_training_data_availability', 'train_with_checks', 'get_trainer',
]