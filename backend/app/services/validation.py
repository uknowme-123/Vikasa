"""Request validation logic for Vikāsa sensor data API."""

from typing import Optional, Dict, Any
from datetime import datetime

from backend.app.schemas.sensor import SensorReadingCreate
from backend.app.utils.errors import ValidationError
from backend.app.config import config


def validate_sensor_reading(data: Dict[str, Any]) -> SensorReadingCreate:
    """Validate and parse sensor reading request data.
    
    Args:
        data: Raw request JSON data
        
    Returns:
        Validated SensorReadingCreate model
        
    Raises:
        ValidationError: If validation fails
    """
    if not data:
        raise ValidationError("Request body is required")

    # Check required fields
    required_fields = ["reading_id", "plant_id", "session_id", "timestamp", "operator_id"]
    missing = [field for field in required_fields if field not in data or not data[field]]
    if missing:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing)}",
            details={"missing_fields": missing},
        )

    # Validate reading_id format
    reading_id = data.get("reading_id")
    if reading_id:
        import re
        if not re.match(config.reading_id_pattern, reading_id):
            raise ValidationError(
                f"reading_id must match pattern: {config.reading_id_pattern}",
                details={"reading_id": reading_id, "pattern": config.reading_id_pattern},
            )

    # Validate timestamp format and reasonableness
    timestamp_str = data.get("timestamp")
    if timestamp_str:
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            # Check timestamp is not too far in future (allow 5 min clock skew)
            now = datetime.utcnow()
            if timestamp > now.replace(tzinfo=None) + __import__("datetime").timedelta(minutes=5):
                raise ValidationError(
                    "Timestamp cannot be in the future",
                    details={"timestamp": timestamp_str, "max_allowed": now.isoformat()},
                )
            # Check timestamp is not too old (1 year)
            if timestamp < now.replace(tzinfo=None) - __import__("datetime").timedelta(days=365):
                raise ValidationError(
                    "Timestamp is too old (more than 1 year)",
                    details={"timestamp": timestamp_str, "min_allowed": (now - __import__("datetime").timedelta(days=365)).isoformat()},
                )
        except ValueError as e:
            if "Timestamp cannot" in str(e) or "Timestamp is too old" in str(e):
                raise
            raise ValidationError(
                "Invalid timestamp format. Use ISO 8601 (e.g., 2026-10-04T10:30:00Z)",
                details={"timestamp": timestamp_str},
            )

    # Validate numeric fields are finite and in range
    numeric_fields = {
        "red_raw": (0, 65535),
        "nir_raw": (0, 65535),
        "red_dark": (0, 65535),
        "nir_dark": (0, 65535),
        "red_reference": (0, 65535),
        "nir_reference": (0, 65535),
        "red_reflectance": (0.0, 100.0),
        "nir_reflectance": (0.0, 100.0),
        "ndvi": (-1.0, 1.0),
        "temperature_c": (-50.0, 100.0),
        "humidity_pct": (0.0, 100.0),
        "soil_moisture_raw": (0, 65535),
        "soil_moisture_pct": (0.0, 100.0),
        "ambient_light_raw": (0, 65535),
    }

    for field, (min_val, max_val) in numeric_fields.items():
        value = data.get(field)
        if value is not None:
            try:
                if isinstance(min_val, float):
                    value = float(value)
                else:
                    value = int(value)

                # Check for NaN and infinity
                if value != value or value == float('inf') or value == float('-inf'):
                    raise ValidationError(
                        f"{field} must be a finite number",
                        details={field: data.get(field)},
                    )

                if not (min_val <= value <= max_val):
                    raise ValidationError(
                        f"{field} must be between {min_val} and {max_val}",
                        details={field: data.get(field)},
                    )
            except (ValueError, TypeError) as e:
                if "must be" in str(e) and "between" in str(e):
                    raise
                raise ValidationError(
                    f"{field} must be a valid number",
                    details={field: data.get(field)},
                )

    # Validate calibration consistency
    has_red_ref = data.get("red_reflectance") is not None
    has_nir_ref = data.get("nir_reflectance") is not None
    has_ndvi = data.get("ndvi") is not None

    if has_red_ref != has_nir_ref:
        raise ValidationError(
            "Both red_reflectance and nir_reflectance must be provided together",
            details={"red_reflectance": data.get("red_reflectance"), "nir_reflectance": data.get("nir_reflectance")},
        )

    if has_ndvi and not (has_red_ref and has_nir_ref):
        raise ValidationError(
            "NDVI requires calibrated reflectance values",
            details={"ndvi": data.get("ndvi")},
        )

    # Use Pydantic for final validation
    try:
        return SensorReadingCreate(**data)
    except Exception as e:
        # Convert Pydantic validation errors to our format
        from pydantic import ValidationError as PydanticValidationError
        if isinstance(e, PydanticValidationError):
            errors = []
            for err in e.errors():
                field = ".".join(str(loc) for loc in err["loc"])
                errors.append(f"{field}: {err['msg']}")
            raise ValidationError(
                "Validation failed",
                details={"errors": errors},
            )
        raise ValidationError(str(e))


def validate_pagination_params(
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    plant_id: Optional[str] = None,
    session_id: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
) -> tuple[int, int, Optional[str], Optional[str], Optional[datetime], Optional[datetime]]:
    """Validate and normalize pagination parameters."""
    # Defaults
    validated_page = max(1, page or 1)
    validated_page_size = min(1000, max(1, page_size or 50))

    # Validate plant_id
    validated_plant_id = plant_id.strip() if plant_id else None

    # Validate session_id
    validated_session_id = session_id.strip() if session_id else None

    # Validate timestamps
    validated_start_time = None
    validated_end_time = None

    if start_time:
        try:
            validated_start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except ValueError:
            raise ValidationError(
                "Invalid start_time format. Use ISO 8601.",
                details={"start_time": start_time},
            )

    if end_time:
        try:
            validated_end_time = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        except ValueError:
            raise ValidationError(
                "Invalid end_time format. Use ISO 8601.",
                details={"end_time": end_time},
            )

    if validated_start_time and validated_end_time and validated_start_time > validated_end_time:
        raise ValidationError(
            "start_time must be before end_time",
            details={"start_time": start_time, "end_time": end_time},
        )

    return (
        validated_page,
        validated_page_size,
        validated_plant_id,
        validated_session_id,
        validated_start_time,
        validated_end_time,
    )