"""Sensor data routes for Vikāsa API."""

from datetime import datetime
from typing import Optional
from flask import Blueprint, request
from backend.app.services.storage import StorageService, PaginationParams
from backend.app.services.validation import validate_sensor_reading, validate_pagination_params
from backend.app.schemas.responses import ResponseEnvelope, PaginatedResponse
from backend.app.schemas.sensor import SensorReadingResponse, SensorReadingListResponse
from backend.app.utils.errors import ValidationError, StorageError
from backend.app.utils.logging import get_logger, get_correlation_id, set_correlation_id


logger = get_logger(__name__)

sensor_bp = Blueprint("sensor_data", __name__, url_prefix="/api")


def register_sensor_routes(storage: StorageService) -> Blueprint:
    """Register sensor data routes with storage dependency."""

    @sensor_bp.route("/sensor-data", methods=["POST"])
    def create_sensor_reading():
        """Create a new sensor reading."""
        correlation_id = set_correlation_id(request.headers.get("X-Correlation-ID"))

        try:
            data = request.get_json()
            if data is None:
                raise ValidationError("Request body must be valid JSON")

            # Validate and parse
            reading = validate_sensor_reading(data)

            # Store the reading
            import asyncio
            stored_reading = asyncio.run(storage.create_reading(reading))

            logger.info(
                "Sensor reading created",
                extra={"reading_id": reading.reading_id, "plant_id": reading.plant_id},
            )

            response = ResponseEnvelope.success_response(
                stored_reading,
                request_id=correlation_id,
            )
            return response.model_dump(mode="json"), 201

        except ValidationError:
            raise
        except Exception as e:
            logger.error("Failed to create sensor reading", extra={"error": str(e)})
            raise StorageError(f"Failed to store reading: {e}")

    @sensor_bp.route("/sensor-data/latest", methods=["GET"])
    def get_latest_reading():
        """Get the latest sensor reading, optionally filtered by plant."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")

        plant_id = request.args.get("plant_id")

        try:
            import asyncio
            reading = asyncio.run(storage.get_latest_reading(plant_id))

            if reading is None:
                response = ResponseEnvelope.success_response(
                    None,
                    request_id=correlation_id,
                )
                return response.model_dump(mode="json"), 404

            response = ResponseEnvelope.success_response(reading, request_id=correlation_id)
            return response.model_dump(mode="json"), 200

        except Exception as e:
            logger.error("Failed to get latest reading", extra={"error": str(e)})
            raise StorageError(f"Failed to retrieve latest reading: {e}")

    @sensor_bp.route("/sensor-data", methods=["GET"])
    def list_sensor_readings():
        """List sensor readings with pagination and filters."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")

        try:
            # Validate pagination parameters
            page, page_size, plant_id, session_id, start_time, end_time = validate_pagination_params(
                page=request.args.get("page", type=int),
                page_size=request.args.get("page_size", type=int),
                plant_id=request.args.get("plant_id"),
                session_id=request.args.get("session_id"),
                start_time=request.args.get("start_time"),
                end_time=request.args.get("end_time"),
            )

            params = PaginationParams(
                page=page,
                page_size=page_size,
                plant_id=plant_id,
                session_id=session_id,
                start_time=start_time,
                end_time=end_time,
            )

            import asyncio
            readings, total = asyncio.run(storage.list_readings(params))

            paginated = PaginatedResponse.create(
                items=[SensorReadingResponse.model_validate(r) for r in readings],
                total=total,
                page=page,
                page_size=page_size,
            )

            response = ResponseEnvelope.success_response(
                paginated,
                request_id=correlation_id,
            )
            return response.model_dump(mode="json"), 200

        except ValidationError:
            raise
        except Exception as e:
            logger.error("Failed to list sensor readings", extra={"error": str(e)})
            raise StorageError(f"Failed to list readings: {e}")

    return sensor_bp