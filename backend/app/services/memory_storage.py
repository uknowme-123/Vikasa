"""In-memory storage implementation for Vikāsa sensor data."""

import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from copy import deepcopy

from backend.app.services.storage import (
    StorageService,
    StorageStats,
    PaginationParams,
)
from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from backend.app.utils.errors import DuplicateError, StorageError
from backend.app.utils.logging import get_logger


logger = get_logger(__name__)


class InMemoryStorage(StorageService):
    """In-memory storage for development and testing."""

    def __init__(self):
        self._readings: Dict[str, SensorReadingResponse] = {}
        self._lock = asyncio.Lock()
        self._initialized = False
        self._start_time = datetime.utcnow()

    async def initialize(self) -> None:
        """Initialize the in-memory storage."""
        async with self._lock:
            self._readings.clear()
            self._initialized = True
            logger.info("In-memory storage initialized")

    async def close(self) -> None:
        """Close the storage (no-op for in-memory)."""
        async with self._lock:
            self._readings.clear()
            self._initialized = False
            logger.info("In-memory storage closed")

    async def health_check(self) -> StorageStats:
        """Check storage health."""
        async with self._lock:
            return StorageStats(
                total_readings=len(self._readings),
                backend_type="memory",
                is_healthy=True,
                details={
                    "uptime_seconds": (datetime.utcnow() - self._start_time).total_seconds(),
                    "initialized": self._initialized,
                },
            )

    async def create_reading(self, reading: SensorReadingCreate) -> SensorReadingResponse:
        """Create a new sensor reading."""
        async with self._lock:
            if reading.reading_id in self._readings:
                raise DuplicateError(
                    f"Reading with ID {reading.reading_id} already exists",
                    details={"reading_id": reading.reading_id},
                )

            # Create response with server-generated fields
            response = SensorReadingResponse(
                **reading.model_dump(),
                created_at=datetime.utcnow(),
            )

            self._readings[reading.reading_id] = response
            logger.info("Created reading", extra={"reading_id": reading.reading_id, "plant_id": reading.plant_id})
            return response

    async def get_reading(self, reading_id: str) -> Optional[SensorReadingResponse]:
        """Get a single reading by ID."""
        async with self._lock:
            reading = self._readings.get(reading_id)
            return deepcopy(reading) if reading else None

    async def get_latest_reading(self, plant_id: Optional[str] = None) -> Optional[SensorReadingResponse]:
        """Get the most recent reading, optionally filtered by plant."""
        async with self._lock:
            readings = list(self._readings.values())

            if plant_id:
                readings = [r for r in readings if r.plant_id == plant_id]

            if not readings:
                return None

            # Sort by timestamp descending
            readings.sort(key=lambda r: r.timestamp, reverse=True)
            return deepcopy(readings[0])

    async def list_readings(self, params: PaginationParams) -> tuple[List[SensorReadingResponse], int]:
        """List readings with pagination and filters."""
        async with self._lock:
            readings = list(self._readings.values())

            # Apply filters
            if params.plant_id:
                readings = [r for r in readings if r.plant_id == params.plant_id]
            if params.session_id:
                readings = [r for r in readings if r.session_id == params.session_id]
            if params.start_time:
                readings = [r for r in readings if r.timestamp >= params.start_time]
            if params.end_time:
                readings = [r for r in readings if r.timestamp <= params.end_time]

            # Sort by timestamp descending (newest first)
            readings.sort(key=lambda r: r.timestamp, reverse=True)

            total = len(readings)

            # Apply pagination
            start = (params.page - 1) * params.page_size
            end = start + params.page_size
            page_readings = readings[start:end]

            return [deepcopy(r) for r in page_readings], total

    async def count_readings(self) -> int:
        """Get total count of stored readings."""
        async with self._lock:
            return len(self._readings)