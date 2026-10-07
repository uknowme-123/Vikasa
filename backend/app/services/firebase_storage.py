"""Firebase Realtime Database storage implementation for Vikāsa sensor data."""

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Callable

import firebase_admin
from firebase_admin import credentials, db

from backend.app.config import config
from backend.app.services.storage import (
    StorageService,
    StorageStats,
    PaginationParams,
)
from backend.app.schemas.sensor import SensorReadingCreate, SensorReadingResponse
from backend.app.utils.errors import DuplicateError, FirebaseError as StorageFirebaseError, StorageError
from backend.app.utils.logging import get_logger


logger = get_logger(__name__)


class FirebaseStorage(StorageService):
    """Firebase storage using ``/readings/{reading_id}`` as the canonical record path.

    Each record keeps ``plant_id``, ``session_id``, and an ISO-8601 ``timestamp``.
    Firebase indexes are documented in ``docs/firebase_setup.md``. Firebase can
    efficiently query one indexed child at a time, so combined filters are applied
    locally after a bounded server query.
    """

    def __init__(self, *, config_value=None, db_reference=None):
        self._config = config_value or config
        self._app: Optional[firebase_admin.App] = None
        self._ref = db_reference
        self._initialized = False
        self._last_error: Optional[str] = None

    async def initialize(self) -> None:
        """Initialize Firebase Admin SDK and database reference."""
        if self._initialized:
            return

        errors = self._config.validate_firebase_config()
        if errors:
            raise StorageError("Firebase configuration invalid", details={"errors": errors})

        try:
            if self._ref is None:
                if self._config.firebase_credentials_path:
                    cred = credentials.Certificate(self._config.firebase_credentials_path)
                    options = {"databaseURL": self._config.firebase_database_url}
                    if self._config.firebase_project_id:
                        options["projectId"] = self._config.firebase_project_id
                    self._app = firebase_admin.initialize_app(cred, options)
                else:
                    self._app = firebase_admin.initialize_app(
                        options={
                            "databaseURL": self._config.firebase_database_url,
                            "projectId": self._config.firebase_project_id,
                        }
                    )
                self._ref = db.reference("/readings", app=self._app)
            self._initialized = True
            self._last_error = None

            logger.info(
                "Firebase storage initialized",
                extra={"project_id": self._config.firebase_project_id},
            )

        except Exception as e:
            self._last_error = str(e)
            logger.error("Failed to initialize Firebase", extra={"error": str(e)})
            raise StorageFirebaseError("Firebase initialization failed", details={"reason": str(e)})

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

    async def smoke_test(self) -> bool:
        """
        Perform a Firebase connectivity smoke test by writing a test record.
        
        This should only be called explicitly when FIREBASE_SMOKE_TEST=true is set.
        The test record is marked with test_only: true to be unmistakably identifiable.
        
        Returns:
            True if smoke test passes, False otherwise.
        """
        if not self._config.firebase_smoke_test:
            logger.info("Smoke test skipped: FIREBASE_SMOKE_TEST not enabled")
            return False
        
        if not self._initialized or not self._ref:
            logger.error("Cannot run smoke test: Firebase not initialized")
            return False
        
        try:
            ref = self._require_reference()
            test_reading_id = f"SMOKE_TEST_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
            test_data = {
                "reading_id": test_reading_id,
                "plant_id": "SMOKE_TEST_PLANT",
                "session_id": "SMOKE_TEST_SESSION",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "operator_id": "SMOKE_TEST_OPERATOR",
                "test_only": True,
                "notes": "FIREBASE SMOKE TEST - NOT A REAL READING",
            }
            
            # Write test record
            await self._run(lambda: ref.child(test_reading_id).set(test_data))
            
            # Verify we can read it back
            data = await self._run(
                lambda: ref.child(test_reading_id).get(timeout=self._config.firebase_timeout_seconds)
            )
            
            if data and data.get("test_only") is True:
                # Clean up test record
                await self._run(lambda: ref.child(test_reading_id).delete())
                logger.info("Firebase smoke test passed", extra={"test_reading_id": test_reading_id})
                return True
            else:
                logger.error("Firebase smoke test failed: could not verify test record")
                return False
                
        except Exception as e:
            logger.error("Firebase smoke test failed", extra={"error": str(e)})
            return False

    def _require_reference(self):
        if not self._initialized or self._ref is None:
            raise StorageFirebaseError("Firebase storage not initialized")
        return self._ref

    async def _run(self, operation: Callable[[], Any]) -> Any:
        """Run the synchronous Admin SDK call without blocking Flask's event loop."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, operation)

    async def health_check(self) -> StorageStats:
        """Check Firebase connection health."""
        if not self._initialized or not self._ref:
            return StorageStats(
                total_readings=0,
                backend_type="firebase",
                is_healthy=False,
                last_error="Not initialized",
                details={"project_id": self._config.firebase_project_id},
            )

        try:
            test_ref = self._ref.limit_to_first(1)
            await self._run(lambda: test_ref.get(shallow=True, timeout=self._config.firebase_timeout_seconds))
            stats = await self._get_storage_stats()

            return StorageStats(
                total_readings=stats.get("total_readings", 0),
                backend_type="firebase",
                is_healthy=True,
                last_error=None,
                details={
                    "project_id": self._config.firebase_project_id,
                    "database_url": self._config.firebase_database_url,
                },
            )

        except Exception as e:
            self._last_error = str(e)
            logger.error("Firebase health check failed", extra={"error": str(e)})
            return StorageStats(
                total_readings=0,
                backend_type="firebase",
                is_healthy=False,
                last_error=str(e),
                details={"project_id": self._config.firebase_project_id},
            )

    async def _get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            # Get shallow count
            count_ref = self._ref.order_by_key()
            snapshot = await self._run(
                lambda: count_ref.get(shallow=True, timeout=self._config.firebase_timeout_seconds)
            )

            if snapshot is None:
                return {"total_readings": 0}

            # For shallow read, count keys
            if isinstance(snapshot, dict):
                return {"total_readings": len(snapshot)}
            return {"total_readings": 0}

        except Exception as e:
            logger.warning("Failed to get storage stats", extra={"error": str(e)})
            raise StorageFirebaseError("Failed to count Firebase readings", details={"reason": str(e)})

    def _convert_to_response(self, reading_id: str, data: Dict[str, Any]) -> SensorReadingResponse:
        """Convert Firebase data to SensorReadingResponse."""
        data = deepcopy(data)
        data["reading_id"] = reading_id
        if "created_at" not in data:
            data["created_at"] = data.get("timestamp", datetime.now(timezone.utc).isoformat())

        return SensorReadingResponse(**data)

    async def create_reading(self, reading: SensorReadingCreate) -> SensorReadingResponse:
        """Create a new sensor reading in Firebase."""
        ref = self._require_reference()
        reading_data = reading.model_dump(mode="json")
        reading_data["created_at"] = datetime.now(timezone.utc).isoformat()

        def reserve_reading(current):
            if current is not None:
                raise DuplicateError(
                    f"Reading with ID {reading.reading_id} already exists",
                    details={"reading_id": reading.reading_id},
                )
            return reading_data

        try:
            await self._run(lambda: ref.child(reading.reading_id).transaction(reserve_reading))
        except DuplicateError:
            raise
        except Exception as e:
            logger.error("Firebase write failed", extra={"error": str(e)})
            raise StorageFirebaseError("Firebase write failed", details={"reason": str(e)})

        logger.info(
            "Created reading in Firebase",
            extra={"reading_id": reading.reading_id, "plant_id": reading.plant_id},
        )
        return SensorReadingResponse(**reading_data)

    async def get_reading(self, reading_id: str) -> Optional[SensorReadingResponse]:
        """Get a single reading by its stable reading ID."""
        ref = self._require_reference()
        try:
            data = await self._run(
                lambda: ref.child(reading_id).get(timeout=self._config.firebase_timeout_seconds)
            )
            if data is None:
                return None
            return self._convert_to_response(reading_id, data)
        except Exception as e:
            logger.error("Error reading from Firebase", extra={"error": str(e), "reading_id": reading_id})
            raise StorageFirebaseError("Failed to read reading", details={"reason": str(e)})

    async def get_latest_reading(self, plant_id: Optional[str] = None) -> Optional[SensorReadingResponse]:
        """Get the most recent reading, optionally filtered by plant."""
        ref = self._require_reference()

        try:
            if plant_id:
                query = ref.order_by_child("plant_id").equal_to(plant_id)
            else:
                query = ref.order_by_child("timestamp")

            snapshot = await self._run(
                lambda: query.get(timeout=self._config.firebase_timeout_seconds)
            )

            if not snapshot:
                return None

            readings = [
                self._convert_to_response(reading_id, data)
                for reading_id, data in snapshot.items()
            ]
            return max(readings, key=lambda reading: reading.timestamp)

        except Exception as e:
            logger.error("Error getting latest reading", extra={"error": str(e), "plant_id": plant_id})
            raise StorageFirebaseError("Failed to get latest reading", details={"reason": str(e)})

    async def list_readings(self, params: PaginationParams) -> tuple[List[SensorReadingResponse], int]:
        """List readings with pagination and filters."""
        ref = self._require_reference()

        try:
            query = ref.order_by_child("plant_id").equal_to(params.plant_id) if params.plant_id else ref
            snapshot = await self._run(
                lambda: query.get(timeout=self._config.firebase_timeout_seconds)
            )

            if not snapshot:
                return [], 0

            readings = []
            for reading_id, data in snapshot.items():
                reading = self._convert_to_response(reading_id, data)
                if params.session_id and reading.session_id != params.session_id:
                    continue
                if params.start_time and reading.timestamp < params.start_time:
                    continue
                if params.end_time and reading.timestamp > params.end_time:
                    continue
                readings.append(reading)

            readings.sort(key=lambda r: r.timestamp, reverse=True)
            total = len(readings)
            start = (params.page - 1) * params.page_size
            end = start + params.page_size
            return readings[start:end], total

        except Exception as e:
            logger.error("Error listing readings", extra={"error": str(e)})
            raise StorageFirebaseError("Failed to list readings", details={"reason": str(e)})

    async def count_readings(self) -> int:
        """Get total count of stored readings."""
        self._require_reference()

        try:
            snapshot = await self._run(
                lambda: self._ref.get(shallow=True, timeout=self._config.firebase_timeout_seconds)
            )

            if snapshot is None:
                return 0

            if isinstance(snapshot, dict):
                return len(snapshot)
            return 0

        except Exception as e:
            logger.error("Error counting readings", extra={"error": str(e)})
            raise StorageFirebaseError("Failed to count readings", details={"reason": str(e)})