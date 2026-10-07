"""
Vikāsa Data Preprocessing - Scaling

Scaling and normalization operations for sensor data.
Uses configuration for scalers so they can be fitted on training data and applied to test data.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - scaler fitting requires real data statistics.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import pandas as pd
import numpy as np
import pickle
import json


@dataclass
class ScalerConfig:
    """Configuration for a scaler."""
    scaler_type: str  # 'standard', 'minmax', 'robust'
    feature_columns: List[str]
    parameters: Dict[str, Any]  # scaler-specific parameters


class BaseScaler:
    """Base class for scalers."""
    
    def __init__(self, feature_columns: List[str]):
        self.feature_columns = feature_columns
        self.fitted = False
    
    def fit(self, df: pd.DataFrame) -> 'BaseScaler':
        """Fit scaler on DataFrame."""
        raise NotImplementedError
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform DataFrame using fitted scaler."""
        raise NotImplementedError
    
    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fit and transform in one step."""
        self.fit(df)
        return self.transform(df)
    
    def save(self, filepath: Path) -> None:
        """Save scaler to disk."""
        raise NotImplementedError
    
    @classmethod
    def load(cls, filepath: Path) -> 'BaseScaler':
        """Load scaler from disk."""
        raise NotImplementedError


class StandardScalerWrapper(BaseScaler):
    """Standard scaler (zero mean, unit variance)."""
    
    def __init__(self, feature_columns: List[str]):
        super().__init__(feature_columns)
        self.means: Dict[str, float] = {}
        self.stds: Dict[str, float] = {}
    
    def fit(self, df: pd.DataFrame) -> 'StandardScalerWrapper':
        for col in self.feature_columns:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                self.means[col] = float(series.mean())
                self.stds[col] = float(series.std())
                if self.stds[col] == 0:
                    self.stds[col] = 1.0  # Avoid division by zero
        self.fitted = True
        return self
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise ValueError("Scaler not fitted. Call fit() first.")
        
        df = df.copy()
        for col in self.feature_columns:
            if col in df.columns:
                df[col] = (pd.to_numeric(df[col], errors='coerce') - self.means[col]) / self.stds[col]
        return df
    
    def save(self, filepath: Path) -> None:
        if not self.fitted:
            raise ValueError("Cannot save unfitted scaler")
        data = {
            'scaler_type': 'standard',
            'feature_columns': self.feature_columns,
            'means': self.means,
            'stds': self.stds,
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load(cls, filepath: Path) -> 'StandardScalerWrapper':
        with open(filepath, 'r') as f:
            data = json.load(f)
        scaler = cls(data['feature_columns'])
        scaler.means = data['means']
        scaler.stds = data['stds']
        scaler.fitted = True
        return scaler


class MinMaxScalerWrapper(BaseScaler):
    """MinMax scaler (scale to [0, 1] range)."""
    
    def __init__(self, feature_columns: List[str], feature_range: Tuple[float, float] = (0.0, 1.0)):
        super().__init__(feature_columns)
        self.feature_range = feature_range
        self.mins: Dict[str, float] = {}
        self.maxs: Dict[str, float] = {}
    
    def fit(self, df: pd.DataFrame) -> 'MinMaxScalerWrapper':
        for col in self.feature_columns:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                self.mins[col] = float(series.min())
                self.maxs[col] = float(series.max())
                if self.maxs[col] == self.mins[col]:
                    self.maxs[col] = self.mins[col] + 1.0
        self.fitted = True
        return self
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise ValueError("Scaler not fitted. Call fit() first.")
        
        df = df.copy()
        min_out, max_out = self.feature_range
        for col in self.feature_columns:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                df[col] = (series - self.mins[col]) / (self.maxs[col] - self.mins[col]) * (max_out - min_out) + min_out
        return df
    
    def save(self, filepath: Path) -> None:
        if not self.fitted:
            raise ValueError("Cannot save unfitted scaler")
        data = {
            'scaler_type': 'minmax',
            'feature_columns': self.feature_columns,
            'feature_range': list(self.feature_range),
            'mins': self.mins,
            'maxs': self.maxs,
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load(cls, filepath: Path) -> 'MinMaxScalerWrapper':
        with open(filepath, 'r') as f:
            data = json.load(f)
        scaler = cls(data['feature_columns'], tuple(data['feature_range']))
        scaler.mins = data['mins']
        scaler.maxs = data['maxs']
        scaler.fitted = True
        return scaler


class RobustScalerWrapper(BaseScaler):
    """Robust scaler (median and IQR)."""
    
    def __init__(self, feature_columns: List[str], quantile_range: Tuple[float, float] = (25.0, 75.0)):
        super().__init__(feature_columns)
        self.quantile_range = quantile_range
        self.medians: Dict[str, float] = {}
        self.iqrs: Dict[str, float] = {}
    
    def fit(self, df: pd.DataFrame) -> 'RobustScalerWrapper':
        for col in self.feature_columns:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                q_low, q_high = self.quantile_range
                q1 = series.quantile(q_low / 100.0)
                q3 = series.quantile(q_high / 100.0)
                self.medians[col] = float(series.median())
                iqr = q3 - q1
                self.iqrs[col] = float(iqr) if iqr > 0 else 1.0
        self.fitted = True
        return self
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise ValueError("Scaler not fitted. Call fit() first.")
        
        df = df.copy()
        for col in self.feature_columns:
            if col in df.columns:
                df[col] = (pd.to_numeric(df[col], errors='coerce') - self.medians[col]) / self.iqrs[col]
        return df
    
    def save(self, filepath: Path) -> None:
        if not self.fitted:
            raise ValueError("Cannot save unfitted scaler")
        data = {
            'scaler_type': 'robust',
            'feature_columns': self.feature_columns,
            'quantile_range': list(self.quantile_range),
            'medians': self.medians,
            'iqrs': self.iqrs,
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load(cls, filepath: Path) -> 'RobustScalerWrapper':
        with open(filepath, 'r') as f:
            data = json.load(f)
        scaler = cls(data['feature_columns'], tuple(data['quantile_range']))
        scaler.medians = data['medians']
        scaler.iqrs = data['iqrs']
        scaler.fitted = True
        return scaler


# Scaler factory
SCALER_TYPES = {
    'standard': StandardScalerWrapper,
    'minmax': MinMaxScalerWrapper,
    'robust': RobustScalerWrapper,
}


def create_scaler(scaler_type: str, feature_columns: List[str], **kwargs) -> BaseScaler:
    """Create scaler instance by type."""
    if scaler_type not in SCALER_TYPES:
        raise ValueError(f"Unknown scaler type: {scaler_type}. Available: {list(SCALER_TYPES.keys())}")
    return SCALER_TYPES[scaler_type](feature_columns, **kwargs)


def load_scaler(filepath: Path) -> BaseScaler:
    """Load scaler from disk, auto-detecting type."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    scaler_type = data.get('scaler_type', 'standard')
    if scaler_type not in SCALER_TYPES:
        raise ValueError(f"Unknown scaler type in file: {scaler_type}")
    return SCALER_TYPES[scaler_type].load(filepath)


# Predefined scaler configurations for Vikāsa features
VIKASA_SCALER_CONFIGS = {
    'optical_raw': {
        'scaler_type': 'robust',
        'feature_columns': ['red_raw', 'nir_raw', 'red_dark', 'nir_dark', 'red_reference', 'nir_reference'],
        'description': 'Raw ADC counts - robust to outliers from sensor noise'
    },
    'optical_calibrated': {
        'scaler_type': 'standard',
        'feature_columns': ['red_reflectance', 'nir_reflectance'],
        'description': 'Calibrated reflectance percentages - standard scaling for bounded features'
    },
    'environmental': {
        'scaler_type': 'standard',
        'feature_columns': ['temperature_c', 'humidity_pct', 'soil_moisture_pct', 'ambient_light_raw'],
        'description': 'Environmental sensor readings'
    },
    'ndvi_only': {
        'scaler_type': 'minmax',
        'feature_columns': ['ndvi'],
        'feature_range': (-1.0, 1.0),
        'description': 'NDVI index - already in [-1, 1] range'
    },
}