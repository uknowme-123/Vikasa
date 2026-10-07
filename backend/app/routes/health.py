"""Health check routes for Vikāsa API."""

from datetime import datetime
from flask import Blueprint, request
from backend.app.services.storage import StorageService
from backend.app.schemas.responses import ResponseEnvelope
from backend.app.schemas.sensor import HealthResponse
from backend.app.utils.logging import get_logger, get_correlation_id


logger = get_logger(__name__)

health_bp = Blueprint("health", __name__, url_prefix="/api")


def register_health_routes(storage: StorageService) -> Blueprint:
    """Register health check routes with storage dependency."""
    blueprint = Blueprint("health", __name__, url_prefix="/api")

    @blueprint.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint."""
        correlation_id = get_correlation_id() or request.headers.get("X-Correlation-ID")

        # Check storage health
        import asyncio
        try:
            storage_stats = asyncio.run(storage.health_check())
        except Exception as e:
            logger.error("Storage health check failed", extra={"error": str(e)})
            storage_stats = type("StorageStats", (), {
                "total_readings": 0,
                "backend_type": "unknown",
                "is_healthy": False,
                "last_error": str(e),
                "details": {},
            })()

        health = HealthResponse(
            status="healthy" if storage_stats.is_healthy else "degraded",
            version="1.0.0",
            timestamp=datetime.utcnow(),
            storage_backend=storage_stats.backend_type,
            storage_healthy=storage_stats.is_healthy,
            storage={
                "backend": storage_stats.backend_type,
                "total_readings": storage_stats.total_readings,
                "healthy": storage_stats.is_healthy,
                "details": storage_stats.details,
            },
        )

        response = ResponseEnvelope.success_response(health, request_id=correlation_id)
        status_code = 200 if storage_stats.is_healthy else 503
        return response.model_dump(mode="json"), status_code

    return blueprint