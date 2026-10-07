"""Dashboard summary, system-status, and alert endpoints."""

import asyncio

from flask import Blueprint, request

from backend.app.schemas.responses import ResponseEnvelope
from backend.app.schemas.sensor import SensorReadingResponse
from backend.app.services.storage import PaginationParams, StorageService
from backend.app.utils.errors import StorageError, VikasaError
from backend.app.utils.logging import get_correlation_id


def register_operations_routes(storage: StorageService) -> Blueprint:
    """Register dashboard-facing endpoints for a storage service."""

    blueprint = Blueprint("operations", __name__, url_prefix="/api")

    @blueprint.route("/plants/summaries", methods=["GET"])
    def get_plant_summaries():
        """Summarize only plants represented by stored readings."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")
        try:
            readings, _ = asyncio.run(
                storage.list_readings(PaginationParams(page=1, page_size=1000))
            )
            grouped: dict[str, list[SensorReadingResponse]] = {}
            for reading in readings:
                grouped.setdefault(reading.plant_id, []).append(reading)

            summaries = []
            for plant_id, plant_readings in grouped.items():
                latest = max(plant_readings, key=lambda reading: reading.timestamp)
                summaries.append(
                    {
                        "plant_id": plant_id,
                        "species": latest.species,
                        "latest_timestamp": latest.timestamp,
                        "health_label": latest.health_label,
                        "reading_count": len(plant_readings),
                    }
                )

            summaries.sort(
                key=lambda summary: summary["latest_timestamp"], reverse=True
            )
            response = ResponseEnvelope.success_response(
                summaries, request_id=correlation_id
            )
            return response.model_dump(mode="json"), 200
        except VikasaError:
            raise
        except Exception as error:
            raise StorageError(
                f"Failed to retrieve plant summaries: {error}"
            ) from error

    @blueprint.route("/system/status", methods=["GET"])
    def get_system_status():
        """Report backend/storage health without claiming device connectivity."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")
        try:
            stats = asyncio.run(storage.health_check())
            status = {
                "api": "connected" if stats.is_healthy else "disconnected",
                "storage_backend": stats.backend_type,
                "storage_healthy": stats.is_healthy,
                "esp32": "unknown",
                "last_sync": None,
                "hardware_note": "ESP32 connectivity has not been verified.",
            }
            response = ResponseEnvelope.success_response(
                status, request_id=correlation_id
            )
            return response.model_dump(mode="json"), 200
        except VikasaError:
            raise
        except Exception as error:
            raise StorageError(
                f"Failed to retrieve system status: {error}"
            ) from error

    @blueprint.route("/alerts", methods=["GET"])
    def get_alerts():
        """Return the truthful empty alert collection until alert rules exist."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")
        response = ResponseEnvelope.success_response(
            {
                "alerts": [],
                "total": 0,
                "generated": False,
                "message": "Alert generation is not implemented.",
            },
            request_id=correlation_id,
        )
        return response.model_dump(mode="json"), 200

    return blueprint
