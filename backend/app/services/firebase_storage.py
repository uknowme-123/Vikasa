"""Firebase Realtime Database storage implementation for Vikāsa sensor data."""

import asyncio
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

import firebase_admin
from firebase_admin import credentials, db
from firebase_admin.exceptions import FirebaseError

from backend.app.config import config
from backend.app.services.storage import (
    StorageService,
    StorageStats,
    PaginationParams,
)
from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from backend.app.utils.errors import DuplicateError, FirebaseError, StorageError
from backend.app.utils.logging import get_logger


logger = get_logger(__name__)


class FirebaseStorage(StorageService):
    """Firebase Realtime Database storage implementation."""

    def __init__(self):
        self._app: Optional[firebase_admin.App] = None
        self._ref: Optional[db.Reference] = None
        self._initialized = False
        self._last_error: Optional[str] = None

    async def initialize(self) -> None:
        """Initialize Firebase Admin SDK and database reference."""
        if self._initialized:
            return

        # Validate config
        errors = config.validate_firebase_config()
        if errors:
            raise StorageError("Firebase configuration invalid", details={"errors": errors})

        try:
            # Initialize Firebase Admin SDK
            cred = credentials.Certificate(config.firebase_credentials_path)
            self._app = firebase_admin.initialize_app(cred, {
                "databaseURL": config.firebase_database_url,
            })

            # Get database reference
            self._ref = db.reference("/readings")
            self._initialized = True
            self._last_error = None

            logger.info(
                "Firebase storage initialized",
                extra={"project_id": config.firebase_project_id},
            )

        except Exception as e:
            self._last_error = str(e)
            logger.error("Failed to initialize Firebase", extra={"error": str(e)})
            raise StorageError(f"Firebase initialization failed: {e}")

    async def close(self) -> None:
        """Close Firebase connections."""
        if self._app:
            try:
                firebase_admin.delete_app(self._app)
            except Exception as e:
                logger.warning("Error closing Firebase app", extra={"error": str(e)})
            self._app = None
            self._ref = None
            self._initialized = False
            logger.info("Firebase storage closed")

    async def health_check(self) -> StorageStats:
        """Check Firebase connection health."""
        if not self._initialized or not self._ref:
            return StorageStats(
                total_readings=0,
                backend_type="firebase",
                is_healthy=False,
                last_error="Not initialized",
                details={"project_id": config.firebase_project_id},
            )

        try:
            # Test connection with a shallow read
            test_ref = self._ref.limit_to_first(1)
            await asyncio.get_event_loop().run_in_executor(None, test_ref.get, True)

            # Get approximate count (shallow read with limit_to_first doesn't give count)
            # Use a separate call for stats
            stats = await self._get_storage_stats()

            return StorageStats(
                total_readings=stats.get("total_readings", 0),
                backend_type="firebase",
                is_healthy=True,
                last_error=None,
                details={
                    "project_id": config.firebase_project_id,
                    "database_url": config.firebase_database_url,
                },
            )

        except FirebaseError as e:
            self._last_error = str(e)
            logger.error("Firebase health check failed", extra={"error": str(e)})
            return StorageStats(
                total_readings=0,
                backend_type="firebase",
                is_healthy=False,
                last_error=str(e),
                details={"project_id": config.firebase_project_id},
            )

    async def _get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            # Get shallow count
            count_ref = self._ref.order_by_key()
            snapshot = await asyncio.get_event_loop().run_in_executor(None, count_ref.get, True)

            if snapshot is None:
                return {"total_readings": 0}

            # For shallow read, count keys
            if isinstance(snapshot, dict):
                return {"total_readings": len(snapshot)}
            return {"total_readings": 0}

        except Exception as e:
            logger.warning("Failed to get storage stats", extra={"error": str(e)})
            return {"total_readings": 0}

    def _validate_reading_id(self, reading_id: str) -> bool:
        """Validate reading ID format."""
        import re
        pattern = config.reading_id_pattern
        return bool(re.match(pattern, reading_id))

    def _convert_to_response(self, reading_id: str, data: Dict[str, Any]) -> SensorReadingResponse:
        """Convert Firebase data to SensorReadingResponse."""
        # Add reading_id and created_at if missing
        data["reading_id"] = reading_id
        if "created_at" not in data:
            data["created_at"] = data.get("timestamp", datetime.utcnow().isoformat())

        return SensorReadingResponse(**data)

    async def create_reading(self, reading: SensorReadingCreate) -> SensorReadingResponse:
        """Create a new sensor reading in Firebase."""
        if not self._initialized or not self._ref:
            raise FirebaseError("Firebase storage not initialized")

        # Validate reading ID format
        if not self._validate_reading_id(reading.reading_id):
            raise ValidationError(
                f"reading_id must match pattern: {config.reading_id_pattern}",
                details={"reading_id": reading.reading_id},
            )

        # Check for duplicate
        try:
            existing = await asyncio.get_event_loop().run_in_executor(
                None, self._ref.child(reading.reading_id).get, True
            )
            if existing is not None:
                raise DuplicateError(
                    f"Reading with ID {reading.reading_id} already exists",
                    details={"reading_id": reading.reading_id},
                )
        except FirebaseError:
            raise
        except Exception as e:
            logger.error("Error checking duplicate", extra={"error": str(e)})
            raise FirebaseError(f"Failed to check duplicate: {e}")

        # Prepare data for storage
        reading_data = reading.model_dump(mode="json")
        reading_data["created_at"] = datetime.utcnow().isoformat()

        try:
            # Write to Firebase
            await asyncio.get_event_loop().run_in_executor(
                None, self._ref.child(reading.reading_id).set, reading_data
            )

            logger.info(
                "Created reading in Firebase",
                extra={"reading_id": reading.reading_id, "plant_id": reading.plant_id},
            )

            return SensorReadingResponse(**reading_data)

        except FirebaseError as e:
            raise FirebaseError(f"Firebase write failed: {e}")
        except Exception as e:
            logger.error("Unexpected error writing to Firebase", extra={"error": str(e)})
            raise FirebaseError(f"Failed to write reading: {e}")

    async def get_reading(self, reading_id: str) -> Optional[SensorReadingResponse]:
        """Get a single reading by ID from Firebase."""
        if not self._initialized or not self._ref:
            raise FirebaseError("Firebase storage not initialized")

        try:
            data = await asyncio.get_event_loop().run_in_executor(
                None, self._ref.child(reading_id).get, True
            )

            if data is None:
                return None

            return self._convert_to_response(reading_id, data)

        except Exception as e:
            logger.error("Error reading from Firebase", extra={"error": str(e), "reading_id": reading_id})
            raise FirebaseError(f"Failed to read reading: {e}")

    async def get_latest_reading(self, plant_id: Optional[str] = None) -> Optional[SensorReadingResponse]:
        """Get the most recent reading, optionally filtered by plant."""
        if not self._initialized or not self._ref:
            raise FirebaseError("Firebase storage not initialized")

        try:
            if plant_id:
                # Query by plant_id and limit to 1 (requires index on plant_id)
                query = self._ref.order_by_child("plant_id").equal_to(plant_id).limit_to_last(1)
            else:
                # Get latest overall (requires index on timestamp)
                query = self._ref.order_by_child("timestamp").limit_to_last(1)

            snapshot = await asyncio.get_event_loop().run_in_executor(None, query.get, True)

            if not snapshot:
                return None

            # Snapshot is a dict with reading_id as key
            for reading_id, data in snapshot.items():
                return self._convert_to_response(reading_id, data)

            return None

        except Exception as e:
            logger.error("Error getting latest reading", extra={"error": str(e), "plant_id": plant_id})
            raise FirebaseError(f"Failed to get latest reading: {e}")

    async def list_readings(self, params: PaginationParams) -> tuple[List[SensorReadingResponse], int]:
        """List readings with pagination and filters."""
        if not self._initialized or not self._ref:
            raise FirebaseError("Firebase storage not initialized")

        try:
            # Build query
            query = self._ref

            if params.plant_id:
                query = query.order_by_child("plant_id").equal_to(params.plant_id)
            elif params.session_id:
                query = query.order_by_child("session_id").equal_to(params.session_id)
            else:
                query = query.order_by_child("timestamp")

            # Apply time range filters
            if params.start_time:
                query = query.start_at(params.start_time.isoformat(), "timestamp")
            if params.end_time:
                query = query.end_at(params.end_time.isoformat(), "timestamp")

            # Get more than page_size to support pagination
            limit = params.page_size * params.page + params.page_size
            query = query.limit_to_last(limit)

            snapshot = await asyncio.get_event_loop().run_in_executor(None, query.get, True)

            if not snapshot:
                return [], 0

            # Convert snapshot to list
            readings = []
            for reading_id, data in snapshot.items():
                readings.append(self._convert_to_response(reading_id, data))

            # Sort by timestamp descending
            readings.sort(key=lambda r: r.timestamp, reverse=True)

            total = len(readings)

            # Apply pagination
            start = (params.page - 1) * params.page_size
            end = start + params.page_size
            page_readings = readings[start:end]

            return page_readings, total

        except Exception as e:
            logger.error("Error listing readings", extra={"error": str(e)})
            raise FirebaseError(f"Failed to list readings: {e}")

    async def count_readings(self) -> int:
        """Get total count of stored readings."""
        if not self._initialized or not self._ref:
            raise FirebaseError("Firebase storage not initialized")

        try:
            # Use shallow read to count
            snapshot = await asyncio.get_event_loop().run_in_executor(
                None, self._ref.limit_to_first(1000000).get, True
            )

            if snapshot is None:
                return 0

            if isinstance(snapshot, dict):
                return len(snapshot)
            return 0

        except Exception as e:
            logger.error("Error counting readings", extra={"error": str(e)})
            raise FirebaseError(f"Failed to count readings: {e}")