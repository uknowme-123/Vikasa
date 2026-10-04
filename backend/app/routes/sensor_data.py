"""Sensor data routes for Vikāsa API."""

from datetime import datetime
from typing import Optional
from flask import Blueprint, request
from backend.app.services.storage import StorageService, PaginationParams
from backend.app.services.validation import validate_sensor_reading, validate_pagination_params
from backend.app.schemas.responses import ResponseEnvelope, PaginatedResponse
from backend.app.schemas.sensor import SensorReadingResponse, SensorReadingListResponse
from backend.app.utils.errors import VikasaError, ValidationError, StorageError, NotFoundError
from backend.app.utils.logging import get_logger, get_correlation_id, set_correlation_id


logger = get_logger(__name__)

sensor_bp = Blueprint("sensor_data", __name__, url_prefix="/api")


def register_sensor_routes(storage: StorageService) -> Blueprint:
    """Register sensor data routes with storage dependency."""
    blueprint = Blueprint("sensor_data", __name__, url_prefix="/api")

    @blueprint.route("/sensor-data", methods=["POST"])
    @blueprint.route("/readings", methods=["POST"])
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
        except VikasaError:
            raise
        except Exception as e:
            logger.error("Failed to create sensor reading", extra={"error": str(e)})
            raise StorageError(f"Failed to store reading: {e}")

    @blueprint.route("/sensor-data/latest", methods=["GET"])
    @blueprint.route("/readings/latest", methods=["GET"])
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

        except VikasaError:
            raise
        except Exception as e:
            logger.error("Failed to get latest reading", extra={"error": str(e)})
            raise StorageError(f"Failed to retrieve latest reading: {e}")

    @blueprint.route("/sensor-data", methods=["GET"])
    @blueprint.route("/readings", methods=["GET"])
    def list_sensor_readings():
        """List sensor readings with pagination and filters."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")

        try:
            raw_page = request.args.get("page")
            if raw_page is not None:
                try:
                    page = int(raw_page)
                except ValueError:
                    raise ValidationError("page must be an integer")
                if page < 1:
                    raise ValidationError("page must be at least 1")
            else:
                page = None

            raw_limit = request.args.get("limit")
            if raw_limit is not None:
                try:
                    limit = int(raw_limit)
                except ValueError:
                    raise ValidationError("limit must be an integer")
                if limit < 1 or limit > 1000:
                    raise ValidationError("limit must be between 1 and 1000")
                requested_page_size = limit
            else:
                raw_page_size = request.args.get("page_size")
                if raw_page_size is not None:
                    try:
                        requested_page_size = int(raw_page_size)
                    except ValueError:
                        raise ValidationError("page_size must be an integer")
                else:
                    requested_page_size = None

            # Validate pagination parameters
            page, page_size, plant_id, session_id, start_time, end_time = validate_pagination_params(
                page=page,
                page_size=requested_page_size,
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
        except VikasaError:
            raise
        except Exception as e:
            logger.error("Failed to list sensor readings", extra={"error": str(e)})
            raise StorageError(f"Failed to list readings: {e}")

    @blueprint.route("/plants/<plant_id>/status", methods=["GET"])
    def get_plant_status(plant_id: str):
        """Return the latest available reading for a plant."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")
        if not plant_id.strip():
            raise ValidationError("plant_id must not be empty")

        try:
            import asyncio
            reading = asyncio.run(storage.get_latest_reading(plant_id.strip()))
            if reading is None:
                raise NotFoundError(
                    f"No reading found for plant {plant_id}",
                    details={"plant_id": plant_id},
                )

            data = {
                "plant_id": plant_id,
                "latest_reading": reading,
                "health_label": reading.health_label,
                "status_available": reading.health_label is not None,
            }
            response = ResponseEnvelope.success_response(data, request_id=correlation_id)
            return response.model_dump(mode="json"), 200
        except VikasaError:
            raise
        except Exception as e:
            logger.error("Failed to get plant status", extra={"error": str(e)})
            raise StorageError(f"Failed to retrieve plant status: {e}")

    return blueprint