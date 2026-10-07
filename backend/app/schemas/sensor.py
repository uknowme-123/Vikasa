"""Pydantic schemas for Vikāsa sensor data matching CSV template."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator
import re

from backend.app.config import config


class SensorReadingBase(BaseModel):
    """Base sensor reading fields shared by request and response."""

    plant_id: str = Field(..., min_length=1, max_length=64, description="Plant identifier")
    session_id: str = Field(..., min_length=1, max_length=64, description="Session identifier")
    timestamp: datetime = Field(..., description="ISO 8601 timestamp of measurement")
    species: Optional[str] = Field(None, max_length=128, description="Plant species")
    stress_type: Optional[str] = Field(None, max_length=32, description="Type of stress")
    health_label: Optional[str] = Field(None, max_length=32, description="Health assessment")
    label_evidence: Optional[str] = Field(None, max_length=256, description="Evidence for health label")

    # Raw optical sensor readings (ADC counts)
    red_raw: Optional[int] = Field(None, ge=0, le=65535, description="Red channel raw ADC count")
    nir_raw: Optional[int] = Field(None, ge=0, le=65535, description="NIR channel raw ADC count")
    red_dark: Optional[int] = Field(None, ge=0, le=65535, description="Red channel dark reading")
    nir_dark: Optional[int] = Field(None, ge=0, le=65535, description="NIR channel dark reading")
    red_reference: Optional[int] = Field(None, ge=0, le=65535, description="Red channel reference reading")
    nir_reference: Optional[int] = Field(None, ge=0, le=65535, description="NIR channel reference reading")

    # Calibrated reflectance (percentage)
    red_reflectance: Optional[float] = Field(None, ge=0.0, le=100.0, description="Red reflectance %")
    nir_reflectance: Optional[float] = Field(None, ge=0.0, le=100.0, description="NIR reflectance %")

    # Computed indices
    ndvi: Optional[float] = Field(None, ge=-1.0, le=1.0, description="Normalized Difference Vegetation Index")

    # Environmental sensors
    temperature_c: Optional[float] = Field(None, ge=-50.0, le=100.0, description="Temperature in Celsius")
    humidity_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Relative humidity %")
    soil_moisture_raw: Optional[int] = Field(None, ge=0, le=65535, description="Soil moisture raw ADC")
    soil_moisture_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Soil moisture %")
    ambient_light_raw: Optional[int] = Field(None, ge=0, le=65535, description="Ambient light raw ADC")

    # Metadata
    operator_id: str = Field(..., min_length=1, max_length=64, description="Operator identifier")
    notes: Optional[str] = Field(None, max_length=512, description="Additional notes")

    @field_validator("red_reflectance", "nir_reflectance", "soil_moisture_pct", "humidity_pct")
    @classmethod
    def validate_percentage(cls, v: Optional[float]) -> Optional[float]:
        """Validate percentage values are finite and in range."""
        if v is not None:
            if not (0.0 <= v <= 100.0):
                raise ValueError("Percentage must be between 0 and 100")
            if not (v == v and v != float('inf') and v != float('-inf')):  # NaN check
                raise ValueError("Percentage must be a finite number")
        return v

    @field_validator("ndvi")
    @classmethod
    def validate_ndvi(cls, v: Optional[float]) -> Optional[float]:
        """Validate NDVI is finite and in range."""
        if v is not None:
            if not (-1.0 <= v <= 1.0):
                raise ValueError("NDVI must be between -1 and 1")
            if not (v == v and v != float('inf') and v != float('-inf')):
                raise ValueError("NDVI must be a finite number")
        return v

    @field_validator("temperature_c")
    @classmethod
    def validate_temperature(cls, v: Optional[float]) -> Optional[float]:
        """Validate temperature is finite and reasonable."""
        if v is not None:
            if not (-50.0 <= v <= 100.0):
                raise ValueError("Temperature must be between -50 and 100 Celsius")
            if not (v == v and v != float('inf') and v != float('-inf')):
                raise ValueError("Temperature must be a finite number")
        return v

    @model_validator(mode="after")
    def validate_calibration_consistency(self) -> "SensorReadingBase":
        """Ensure calibrated values are present together."""
        has_red_ref = self.red_reflectance is not None
        has_nir_ref = self.nir_reflectance is not None

        # If one reflectance is provided, the other should be too
        if has_red_ref != has_nir_ref:
            raise ValueError("Both red_reflectance and nir_reflectance must be provided together")

        # If NDVI is provided, reflectance should be too
        if self.ndvi is not None and not (has_red_ref and has_nir_ref):
            raise ValueError("NDVI requires calibrated reflectance values")

        return self


class SensorReadingCreate(SensorReadingBase):
    """Schema for creating a new sensor reading (client provides reading_id)."""

    reading_id: str = Field(..., min_length=1, max_length=64, description="Unique reading identifier")

    @field_validator("reading_id")
    @classmethod
    def validate_reading_id(cls, v: str) -> str:
        """Validate reading ID format."""
        pattern = config.reading_id_pattern
        if not re.match(pattern, v):
            raise ValueError(f"reading_id must match pattern: {pattern}")
        return v


class SensorReadingResponse(SensorReadingBase):
    """Schema for sensor reading responses (includes server-generated fields)."""

    reading_id: str = Field(..., description="Unique reading identifier")
    created_at: datetime = Field(..., description="Server-side creation timestamp")

    class Config:
        from_attributes = True


class SensorReadingListResponse(BaseModel):
    """Paginated list of sensor readings."""

    readings: list[SensorReadingResponse]
    total: int = Field(..., ge=0, description="Total number of readings")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=1000, description="Number of readings per page")
    has_more: bool = Field(..., description="Whether more readings are available")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="API status: healthy, degraded, or unhealthy")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(..., description="Check timestamp")
    storage_backend: str = Field(..., description="Active storage provider")
    storage_healthy: bool = Field(..., description="Whether the storage provider is healthy")
    storage: dict = Field(..., description="Storage backend status")

    class Config:
        from_attributes = True