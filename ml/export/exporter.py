"""
Vikāsa Model Export Interface

Exports trained models for deployment (ONNX, TensorFlow Lite, joblib).
Does NOT train models - only exports.

REQUIRES REAL VIKĀSA HARDWARE DATA: Yes - export requires a trained model from verified data.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
import pickle
import warnings


@dataclass
class ExportConfig:
    """Configuration for model export."""
    export_format: str  # 'onnx', 'tflite', 'joblib', 'pickle'
    input_shape: Optional[Tuple[int, ...]] = None
    input_names: List[str] = None
    output_names: List[str] = None
    quantization: bool = False
    target_opset: int = 17  # ONNX opset version


@dataclass
class ExportResult:
    """Result of model export."""
    export_path: str
    format: str
    file_size_bytes: int
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    warnings: List[str]


class BaseExporter(ABC):
    """Abstract base class for model exporters."""
    
    def __init__(self, model: Any, config: 'ExportConfig'):
        self.model = model
        self.config = config
    
    @abstractmethod
    def export(self, output_path: Path) -> ExportResult:
        """Export model to specified path."""
        pass
    
    def _validate_model(self) -> List[str]:
        """Validate model can be exported."""
        warnings_list = []
        if self.model is None:
            raise ValueError("No model provided for export")
        return warnings_list


class SklearnExporter(BaseExporter):
    """Export scikit-learn compatible models."""
    
    def export(self, output_path: Path) -> 'ExportResult':
        warnings_list = self._validate_model()
        
        if self.config.export_format == 'joblib':
            import joblib
            joblib.dump(self.model, output_path)
            format_name = 'joblib'
        elif self.config.export_format == 'pickle':
            with open(output_path, 'wb') as f:
                pickle.dump(self.model, f)
            format_name = 'pickle'
        elif self.config.export_format == 'onnx':
            return self._export_onnx(output_path)
        else:
            raise ValueError(f"Unsupported format for sklearn: {self.config.export_format}")
        
        file_size = output_path.stat().st_size
        
        return ExportResult(
            export_path=str(output_path),
            format=format_name,
            file_size_bytes=file_size,
            input_schema=self._get_input_schema(),
            output_schema=self._get_output_schema(),
            warnings=self._validate_model(),
        )
    
    def _export_onnx(self, output_path: Path) -> 'ExportResult':
        """Export to ONNX format."""
        try:
            import skl2onnx
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType
        except ImportError:
            raise RuntimeError("ONNX export requires skl2onnx package: pip install skl2onnx")
        
        if self.config.input_shape is None:
            raise ValueError("ONNX export requires input_shape in config")
        
        initial_type = [('input', FloatTensorType(self.config.input_shape))]
        onnx_model = convert_sklearn(
            self.model,
            initial_types=initial_type,
            target_opset=self.config.target_opset,
        )
        
        with open(output_path, 'wb') as f:
            f.write(onnx_model.SerializeToString())
        
        return ExportResult(
            export_path=str(output_path),
            format='onnx',
            file_size_bytes=output_path.stat().st_size,
            input_schema=self._get_input_schema(),
            output_schema=self._get_output_schema(),
            warnings=self._validate_model(),
        )
    
    def _get_input_schema(self) -> Dict[str, Any]:
        """Get input schema for exported model."""
        if hasattr(self.model, 'n_features_in_'):
            n_features = self.model.n_features_in_
        else:
            n_features = len(self.config.input_names) if self.config.input_names else 0
        
        return {
            'type': 'float32',
            'shape': [None, n_features],
            'feature_names': self.config.input_names,
        }
    
    def _get_output_schema(self) -> Dict[str, Any]:
        """Get output schema for exported model."""
        if hasattr(self.model, 'classes_'):
            n_classes = len(self.model.classes_)
            return {
                'type': 'float32',
                'shape': [None, n_classes],
                'class_names': self.model.classes_.tolist() if hasattr(self.model.classes_, 'tolist') else None,
            }
        return {
            'type': 'float32',
            'shape': [None, 1],
        }


class XGBoostExporter(BaseExporter):
    """Export XGBoost models."""
    
    def export(self, output_path: Path) -> 'ExportResult':
        self._validate_model()
        
        if self.config.export_format == 'joblib':
            import joblib
            joblib.dump(self.model, output_path)
            format_name = 'joblib'
        elif self.config.export_format == 'pickle':
            with open(output_path, 'wb') as f:
                pickle.dump(self.model, f)
            format_name = 'pickle'
        elif self.config.export_format == 'onnx':
            return self._export_onnx(output_path)
        elif self.config.export_format == 'xgb':
            # Native XGBoost format
            self.model.save_model(str(output_path))
            format_name = 'xgb'
        else:
            raise ValueError(f"Unsupported format for XGBoost: {self.config.export_format}")
        
        return ExportResult(
            export_path=str(output_path),
            format=format_name,
            file_size_bytes=output_path.stat().st_size,
            input_schema=self._get_input_schema(),
            output_schema=self._get_output_schema(),
            warnings=self._validate_model(),
        )
    
    def _get_input_schema(self) -> Dict[str, Any]:
        if hasattr(self.model, 'feature_names'):
            return {
                'type': 'float32',
                'shape': [None, len(self.model.feature_names)],
                'feature_names': self.model.feature_names,
            }
        return {
            'type': 'float32',
            'shape': [None, None],
        }
    
    def _get_output_schema(self) -> Dict[str, Any]:
        return {'type': 'float32', 'shape': [None, 1]}


class TensorFlowLiteExporter(BaseExporter):
    """Export to TensorFlow Lite format (for ESP32 deployment)."""
    
    def export(self, output_path: Path) -> 'ExportResult':
        self._validate_model()
        
        try:
            import tensorflow as tf
        except ImportError:
            raise RuntimeError("TensorFlow Lite export requires tensorflow package: pip install tensorflow")
        
        # Convert Keras model or SavedModel to TFLite
        if self.config.export_format == 'tflite':
            # Assume model is a tf.keras.Model or path to SavedModel
            converter = tf.lite.TFLiteConverter.from_keras_model(self.model)
            
            if self.config.quantization:
                converter.optimizations = [tf.lite.Optimize.DEFAULT]
            
            tflite_model = converter.convert()
            
            with open(output_path, 'wb') as f:
                f.write(tflite_model)
            
            return ExportResult(
                export_path=str(output_path),
                format='tflite',
                file_size_bytes=output_path.stat().st_size,
                input_schema=self._get_tflite_input_schema(),
                output_schema=self._get_tflite_output_schema(),
                warnings=self._validate_model(),
            )
        else:
            raise ValueError(f"Unsupported format for TFLite exporter: {self.config.export_format}")
    
    def _get_tflite_input_schema(self) -> Dict[str, Any]:
        """Get TFLite input schema."""
        if hasattr(self.model, 'input_shape'):
            return {
                'type': 'float32',
                'shape': list(self.model.input_shape),
            }
        return {'type': 'float32', 'shape': [None, None]}
    
    def _get_tflite_output_schema(self) -> Dict[str, Any]:
        """Get TFLite output schema."""
        if hasattr(self.model, 'output_shape'):
            return {
                'type': 'float32',
                'shape': list(self.model.output_shape),
            }
        return {'type': 'float32', 'shape': [None, 1]}


def export_model(model: Any, 
                 config: ExportConfig, 
                 output_path: Path) -> ExportResult:
    """
    Export model using appropriate exporter based on model type.
    
    Args:
        model: Trained model object
        config: Export configuration
        output_path: Output file path
        
    Returns:
        ExportResult
    """
    # Detect model type and select exporter
    model_type = type(model).__module__
    
    if 'sklearn' in model_type or hasattr(model, 'fit') and hasattr(model, 'predict'):
        exporter = SklearnExporter(model, config)
    elif 'xgboost' in model_type:
        exporter = XGBoostExporter(model, config)
    elif 'tensorflow' in model_type or 'keras' in model_type:
        exporter = TensorFlowLiteExporter(model, config)
    else:
        # Try to infer from available methods
        if hasattr(model, 'feature_importances_') or hasattr(model, 'predict_proba'):
            exporter = SklearnExporter(model, config)
        else:
            raise ValueError(f"Cannot determine exporter for model type: {type(model)}")
    
    return exporter.export(output_path)


def export_for_esp32(model: Any,
                     feature_columns: List[str],
                     target_column: str,
                     output_dir: Path,
                     quantize: bool = True) -> Dict[str, Any]:
    """
    Export model specifically for ESP32 deployment.
    
    Creates:
    - TFLite model (quantized)
    - Feature metadata JSON
    - Normalization parameters JSON
    - C++ header with model data (optional)
    
    Args:
        model: Trained model
        feature_columns: List of feature column names
        target_column: Target column name
        output_dir: Output directory
        quantize: Whether to quantize model
        
    Returns:
        Dict with export results
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    # Export TFLite
    tflite_path = output_dir / 'model.tflite'
    config = ExportConfig(
        export_format='tflite',
        quantization=quantize,
        input_names=feature_columns,
        output_names=[target_column],
    )
    
    try:
        tflite_result = export_model(model, config, tflite_path)
        results['tflite'] = tflite_result.__dict__
    except Exception as e:
        results['tflite_error'] = str(e)
    
    # Export feature metadata
    metadata = {
        'feature_columns': feature_columns,
        'target_column': target_column,
        'model_type': type(model).__name__,
        'input_shape': [1, len(feature_columns)],
        'output_classes': None,
    }
    
    if hasattr(model, 'classes_'):
        metadata['output_classes'] = model.classes_.tolist()
    
    metadata_path = output_dir / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    results['metadata_path'] = str(metadata_path)
    
    # Export normalization parameters if available
    if hasattr(model, 'scaler_') or hasattr(model, 'scaler'):
        scaler = getattr(model, 'scaler_', getattr(model, 'scaler', None))
        if scaler:
            scaler_path = output_dir / 'scaler.pkl'
            joblib.dump(scaler, scaler_path)
            results['scaler_path'] = str(scaler_path)
    
    return results


# Export metadata for Vikāsa deployment
VIKASA_EXPORT_METADATA = {
    'project': 'Vikāsa',
    'model_purpose': 'Plant stress classification',
    'sensor_type': 'BPW34 + LED (Red ~660nm, NIR ~850nm)',
    'features': {
        'optical': ['red_raw', 'nir_raw', 'red_reflectance', 'nir_reflectance', 'ndvi'],
        'environmental': ['temperature_c', 'humidity_pct', 'soil_moisture_pct', 'ambient_light_raw'],
    },
    'labels': {
        'health_label': ['healthy', 'mild', 'moderate', 'severe'],
        'stress_type': ['healthy', 'drought', 'nutrient', 'salinity'],
    },
    'calibration_requirements': {
        'red_reflectance': 'Requires Spectralon reference under identical illumination',
        'nir_reflectance': 'Requires Spectralon reference under identical illumination',
        'ndvi': 'Computed from calibrated reflectance only',
    },
    'data_requirements': {
        'raw_adc_never_used_for_ndvi': True,
        'missing_values_left_blank': True,
        'labels_require_evidence': True,
    },
}